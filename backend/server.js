import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { buildModuleRoutes } from "./routes/moduleRoutes.js";
import {
  isCoursePublished,
  getCourseModulesOrdered,
  getProgressMap,
  getContentCountsByModule,
  buildModuleProgressPayload,
  getOrCreateProgress,
  checkAndUpdateCompletion,
  isModuleUnlockedForUser,
  getLatestQuizAttemptCount,
  computeProgressPercent,
  deriveDisplayStatus,
  isPreviousModuleCompleted,
} from "./services/moduleProgressService.js";
import {
  User,
  Department,
  Course,
  Module,
  Lesson,
  SOP,
  Enrollment,
  Progress,
  NurseFile,
  Question,
  QuizAttempt,
  ModuleAssignment,
  Notification,
  AuditLog,
} from "./schemas/models.js";
import {
  canManageCourse,
  canManageDepartment,
  resolveUserDepartmentId,
  filterUsersByDepartment,
} from "./services/courseAccessService.js";
import {
  notifyAdminsOfCourseSubmission,
  notifySupervisorCourseDecision,
} from "./services/notificationService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nurse_lms_files";

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || "100");
const MAX_UPLOAD_BYTES = Number.isFinite(MAX_UPLOAD_MB)
  ? MAX_UPLOAD_MB * 1024 * 1024
  : 100 * 1024 * 1024;
const inMemoryStorage = multer.memoryStorage();

const nursePdfUpload = multer({
  storage: inMemoryStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

const lessonUpload = multer({
  storage: inMemoryStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/webm" ||
      file.mimetype === "video/quicktime" ||
      file.mimetype.startsWith("video/");
    if (!ok) {
      return cb(new Error("Only PDF and video files are allowed"));
    }
    cb(null, true);
  },
});

const sopPdfUpload = multer({
  storage: inMemoryStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

const moduleContentUpload = multer({
  storage: inMemoryStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const mime = String(file.mimetype || "");
    const filename = String(file.originalname || "").toLowerCase();
    const ok =
      mime === "application/pdf" ||
      mime === "text/plain" ||
      mime === "application/zip" ||
      mime === "application/x-zip-compressed" ||
      mime.startsWith("video/") ||
      filename.endsWith(".scorm") ||
      filename.endsWith(".zip") ||
      filename.endsWith(".txt");
    if (!ok) {
      return cb(new Error("Only PDF, video, SCORM(zip), and text files are allowed"));
    }
    cb(null, true);
  },
});

// Middleware
// Allow all local dev origins and handle CORS automatically
app.use(
  cors({
    origin: true, // reflect the request origin
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Static serving of uploaded PDFs
// Note: We no longer expose raw uploads publicly.

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function getRequestUser(req) {
  const email =
    typeof req.headers["x-user-email"] === "string"
      ? req.headers["x-user-email"].trim().toLowerCase()
      : "";
  if (!email) return null;
  
  const user = await User.findOne({ email }).lean().exec();
  return user || null;
}

function requireAuth() {
  return async (req, res, next) => {
    try {
      const user = await getRequestUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user = user;
      return next();
    } catch (err) {
      console.error("Auth middleware error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

function requireAdmin() {
  return async (req, res, next) => {
    try {
      const user = await getRequestUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = user;
      return next();
    } catch (err) {
      console.error("Admin middleware error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

function requireAdminOrSupervisor() {
  return async (req, res, next) => {
    try {
      const user = await getRequestUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!["admin", "supervisor"].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      req.user = user;
      return next();
    } catch (err) {
      console.error("AdminOrSupervisor middleware error", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

function formatUserResponse(dbUser) {
  const { password: _pw, ...rest } = dbUser;
  return {
    ...rest,
    id: String(rest._id),
  };
}

async function isEnrolledInCourse(userId, courseId) {
  if (!userId || !courseId) return false;
  const exists = await Enrollment.exists({ userId, courseId });
  return !!exists;
}

async function getCourseIdForModule(moduleId) {
  const mod = await Module.findById(moduleId).lean().exec();
  return mod?.courseId ? String(mod.courseId) : null;
}

async function assertCanEditModule(req, res, moduleId) {
  const mod = await Module.findById(moduleId).lean().exec();
  if (!mod) {
    res.status(404).json({ message: "Module not found" });
    return null;
  }
  const { ok, course } = await canManageCourse(req.user, String(mod.courseId));
  if (!ok || !course) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }
  if (
    req.user.role === "supervisor" &&
    !["DRAFT", "REJECTED"].includes(course.status)
  ) {
    res.status(403).json({
      message: "Course cannot be edited while pending approval or published",
    });
    return null;
  }
  return mod;
}

async function canAccessModuleContent(reqUser, moduleId) {
  if (!reqUser) return false;
  if (reqUser.role === "admin" || reqUser.role === "supervisor") return true;

  const mod = await Module.findById(moduleId).lean().exec();
  if (!mod) return false;

  const course = await Course.findById(mod.courseId).lean().exec();
  if (!course || !isCoursePublished(course)) return false;

  const enrolled = await isEnrolledInCourse(reqUser._id, mod.courseId);
  if (!enrolled) return false;

  return isModuleUnlockedForUser(reqUser._id, moduleId);
}

function mapAssignmentStatusToProgress(status) {
  if (status === "COMPLETED") return { status: "COMPLETED", percent: 100 };
  if (status === "IN_PROGRESS") return { status: "IN_PROGRESS", percent: 50 };
  return { status: "NOT_STARTED", percent: 0 };
}

function normalizeProgressStatus(status) {
  if (status === "completed" || status === "COMPLETED") return "COMPLETED";
  if (status === "in-progress" || status === "IN_PROGRESS") return "IN_PROGRESS";
  return "NOT_STARTED";
}

// Auth login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword =
    typeof password === "string" ? password.trim() : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  User.findOne({ email: normalizedEmail })
    .lean()
    .then((dbUser) => {
      if (!dbUser || dbUser.password !== normalizedPassword) {
        return res
          .status(401)
          .json({ message: "Invalid email or password" });
      }

      const token = "session-token";
      return res.json({ user: formatUserResponse(dbUser), token });
    })
    .catch((err) => {
      console.error("Error during login", err);
      res.status(500).json({ message: "Failed to login" });
    });
});

app.post("/api/auth/bootstrap-admin", async (req, res) => {
  try {
    const existingUsers = await User.countDocuments({});
    if (existingUsers > 0) {
      return res.status(403).json({ message: "Bootstrap is disabled after first user creation" });
    }

    const { email, password, name, empId, department } = req.body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedPassword = typeof password === "string" ? password.trim() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmpId = typeof empId === "string" ? empId.trim() : "ADMIN-001";
    const normalizedDepartment =
      typeof department === "string" && department.trim()
        ? department.trim()
        : "Training Administration";

    if (!normalizedEmail || !normalizedPassword || !normalizedName) {
      return res
        .status(400)
        .json({ message: "email, password, and name are required" });
    }

    const user = await User.create({
      email: normalizedEmail,
      password: normalizedPassword,
      name: normalizedName,
      empId: normalizedEmpId,
      department: normalizedDepartment,
      role: "admin",
    });

    const userObj = user.toObject();
    const { password: _pw, ...safeUser } = userObj;
    return res.status(201).json({
      message: "Initial admin user created",
      user: safeUser,
    });
  } catch (err) {
    console.error("Error bootstrapping admin", err);
    return res.status(500).json({ message: "Failed to bootstrap admin user" });
  }
});

// Admin - create user with demo password
app.post("/api/admin/users", requireAdmin(), async (req, res) => {
  try {
    const { email, name, empId, department, departmentId, role } = req.body || {};

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !normalizedEmail ||
      !name ||
      !empId ||
      (!department && !departmentId)
    ) {
      return res.status(400).json({
        message: "Email, name, EmpID, and department are required",
      });
    }

    const existing = await User.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      return res
        .status(409)
        .json({ message: "A user with this email already exists" });
    }

    let resolvedDepartmentId = departmentId || null;
    let departmentName =
      typeof department === "string" ? department.trim() : "";
    if (resolvedDepartmentId) {
      const dept = await Department.findById(resolvedDepartmentId).lean().exec();
      if (!dept) {
        return res.status(400).json({ message: "Invalid departmentId" });
      }
      departmentName = dept.name;
    } else if (departmentName) {
      const dept = await Department.findOne({ name: departmentName }).exec();
      if (dept) resolvedDepartmentId = dept._id;
    }

    const normalizedRole =
      role === "admin"
        ? "admin"
        : role === "supervisor"
          ? "supervisor"
          : "nurse";

    if (normalizedRole === "supervisor" && !resolvedDepartmentId) {
      return res.status(400).json({
        message: "Supervisors must be assigned to a valid department",
      });
    }

    // Use a simple configurable demo password; can be changed later by the user
    const defaultPassword =
      process.env.DEFAULT_USER_PASSWORD || "demo1234";

    const user = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      empId: empId.trim(),
      department: departmentName,
      departmentId: resolvedDepartmentId,
      role: normalizedRole,
      password: defaultPassword,
    });

    const userObj = user.toObject();
    // Do not expose password back to the client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...userWithoutPassword } = userObj;

    return res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
      demoPassword: defaultPassword,
    });
  } catch (err) {
    console.error("Error creating user", err);
    return res.status(500).json({ message: "Failed to create user" });
  }
});

// Admin - list users
app.get("/api/admin/users", requireAdmin(), async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const safeUsers = users.map(({ password, ...rest }) => rest);
    return res.json(safeUsers);
  } catch (err) {
    console.error("Error fetching users", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/admin/course-library-stats", requireAdminOrSupervisor(), async (req, res) => {
  try {
    let courseFilter = {};
    let nurseFilter = { role: "nurse" };
    if (req.user.role === "supervisor") {
      const deptId = await resolveUserDepartmentId(req.user);
      if (!deptId) {
        return res.json({
          departments: 1,
          totalModules: 0,
          questionBank: 0,
          activeNurses: 0,
          courses: 0,
        });
      }
      courseFilter = { departmentId: deptId };
      nurseFilter = await filterUsersByDepartment(req.user, { role: "nurse" });
    }

    const courseIds = (
      await Course.find(courseFilter).select({ _id: 1 }).lean().exec()
    ).map((c) => c._id);

    const [departmentsCount, coursesCount, modulesCount, questionsCount, activeNurses] =
      await Promise.all([
        req.user.role === "admin"
          ? Department.countDocuments({})
          : Promise.resolve(1),
        Course.countDocuments(courseFilter),
        Module.countDocuments({ courseId: { $in: courseIds } }),
        Question.countDocuments({
          moduleId: {
            $in: (
              await Module.find({ courseId: { $in: courseIds } })
                .select({ _id: 1 })
                .lean()
                .exec()
            ).map((m) => m._id),
          },
        }),
        User.countDocuments(nurseFilter),
      ]);

    return res.json({
      departments: departmentsCount,
      totalModules: modulesCount,
      questionBank: questionsCount,
      activeNurses,
      courses: coursesCount,
    });
  } catch (err) {
    console.error("Error fetching course library stats", err);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

app.get("/api/admin/reports/module-progress", requireAdmin(), async (req, res) => {
  try {
    const [nurses, courses, modules, enrollments, progressDocs] = await Promise.all([
      User.find({ role: "nurse" }).select({ _id: 1, name: 1, email: 1 }).lean().exec(),
      Course.find({}).select({ _id: 1, title: 1 }).lean().exec(),
      Module.find({}).select({ _id: 1, courseId: 1 }).lean().exec(),
      Enrollment.find({}).select({ userId: 1, courseId: 1 }).lean().exec(),
      Progress.find({}).select({ userId: 1, moduleId: 1, status: 1, percent: 1 }).lean().exec(),
    ]);

    const modulesByCourseId = new Map();
    for (const mod of modules) {
      const courseKey = String(mod.courseId);
      const list = modulesByCourseId.get(courseKey) || [];
      list.push(String(mod._id));
      modulesByCourseId.set(courseKey, list);
    }

    const progressByUserAndModule = new Map();
    for (const p of progressDocs) {
      progressByUserAndModule.set(`${String(p.userId)}:${String(p.moduleId)}`, p);
    }

    const courseById = new Map(courses.map((c) => [String(c._id), c]));
    const enrollmentsByUserId = new Map();
    for (const e of enrollments) {
      const userKey = String(e.userId);
      const list = enrollmentsByUserId.get(userKey) || [];
      list.push(String(e.courseId));
      enrollmentsByUserId.set(userKey, list);
    }

    const nursesProgress = nurses.map((nurse) => {
      const enrolledCourseIds = enrollmentsByUserId.get(String(nurse._id)) || [];
      const courseProgress = enrolledCourseIds
        .map((courseId) => {
          const course = courseById.get(courseId);
          if (!course) return null;

          const moduleIds = modulesByCourseId.get(courseId) || [];
          const totalModules = moduleIds.length;

          let coveredModules = 0;
          let completedModules = 0;
          for (const moduleId of moduleIds) {
            const progress = progressByUserAndModule.get(`${String(nurse._id)}:${moduleId}`);
            if (progress && (normalizeProgressStatus(progress.status) === "COMPLETED" || Number(progress.percent || 0) > 0)) {
              coveredModules += 1;
            }
            if (progress && normalizeProgressStatus(progress.status) === "COMPLETED") {
              completedModules += 1;
            }
          }

          return {
            courseId,
            courseTitle: course.title,
            totalModules,
            coveredModules,
            completedModules,
            percent: totalModules ? Math.round((coveredModules / totalModules) * 100) : 0,
          };
        })
        .filter(Boolean);

      const totalAssignedModules = courseProgress.reduce((sum, c) => sum + c.totalModules, 0);
      const totalCoveredModules = courseProgress.reduce((sum, c) => sum + c.coveredModules, 0);

      return {
        nurseId: nurse._id,
        nurseName: nurse.name,
        nurseEmail: nurse.email,
        totalAssignedModules,
        totalCoveredModules,
        overallPercent: totalAssignedModules
          ? Math.round((totalCoveredModules / totalAssignedModules) * 100)
          : 0,
        courses: courseProgress,
      };
    });

    return res.json(nursesProgress);
  } catch (err) {
    console.error("Error fetching admin module progress report", err);
    return res.status(500).json({ message: "Failed to fetch progress report" });
  }
});

app.get("/api/reports/my-module-progress", requireAuth(), async (req, res) => {
  try {
    const currentUser = req.user;
    const enrollments = await Enrollment.find({ userId: currentUser._id })
      .select({ courseId: 1 })
      .lean()
      .exec();
    const courseIds = enrollments.map((e) => e.courseId);

    const [courses, modules, progressDocs] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }).select({ _id: 1, title: 1 }).lean().exec(),
      Module.find({ courseId: { $in: courseIds } }).select({ _id: 1, courseId: 1 }).lean().exec(),
      Progress.find({ userId: currentUser._id }).select({ moduleId: 1, status: 1, percent: 1 }).lean().exec(),
    ]);

    const modulesByCourseId = new Map();
    for (const mod of modules) {
      const key = String(mod.courseId);
      const list = modulesByCourseId.get(key) || [];
      list.push(String(mod._id));
      modulesByCourseId.set(key, list);
    }

    const progressByModuleId = new Map(progressDocs.map((p) => [String(p.moduleId), p]));

    const courseProgress = courses.map((course) => {
      const moduleIds = modulesByCourseId.get(String(course._id)) || [];
      const totalModules = moduleIds.length;
      let coveredModules = 0;
      let completedModules = 0;

      for (const moduleId of moduleIds) {
        const progress = progressByModuleId.get(moduleId);
        if (progress && (normalizeProgressStatus(progress.status) === "COMPLETED" || Number(progress.percent || 0) > 0)) {
          coveredModules += 1;
        }
        if (progress && normalizeProgressStatus(progress.status) === "COMPLETED") {
          completedModules += 1;
        }
      }

      return {
        courseId: course._id,
        courseTitle: course.title,
        totalModules,
        coveredModules,
        completedModules,
        percent: totalModules ? Math.round((coveredModules / totalModules) * 100) : 0,
      };
    });

    const totalAssignedModules = courseProgress.reduce((sum, c) => sum + c.totalModules, 0);
    const totalCoveredModules = courseProgress.reduce((sum, c) => sum + c.coveredModules, 0);

    return res.json({
      nurseId: currentUser._id,
      nurseName: currentUser.name,
      nurseEmail: currentUser.email,
      totalAssignedModules,
      totalCoveredModules,
      overallPercent: totalAssignedModules
        ? Math.round((totalCoveredModules / totalAssignedModules) * 100)
        : 0,
      courses: courseProgress,
    });
  } catch (err) {
    console.error("Error fetching my module progress report", err);
    return res.status(500).json({ message: "Failed to fetch progress report" });
  }
});

app.get("/api/admin/dashboard-summary", requireAdmin(), async (req, res) => {
  try {
    const now = new Date();
    const next30 = new Date(now);
    next30.setDate(now.getDate() + 30);

    const [nursesCount, coursesCount, modulesCount, questionsCount, pendingApprovals, latestAttempts] =
      await Promise.all([
        User.countDocuments({ role: "nurse" }),
        Course.countDocuments({}),
        Module.countDocuments({}),
        Question.countDocuments({}),
        Course.countDocuments({ status: "PENDING_APPROVAL" }),
        QuizAttempt.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .exec(),
      ]);

    const completionDocs = await Progress.find({ status: "COMPLETED" })
      .select({ userId: 1, moduleId: 1, updatedAt: 1 })
      .lean()
      .exec();

    const lowScoreAttempts = await QuizAttempt.find({})
      .select({ userId: 1, moduleId: 1, score: 1, totalQuestions: 1, createdAt: 1 })
      .lean()
      .exec();

    const recentActivity = latestAttempts.map((a) => ({
      type: "quiz-attempt",
      userId: a.userId,
      moduleId: a.moduleId,
      score: a.score,
      totalQuestions: a.totalQuestions,
      createdAt: a.createdAt,
    }));

    const nonCompliantCount = lowScoreAttempts.filter((a) => {
      const total = Number(a.totalQuestions || 0);
      if (!total) return false;
      const pct = Math.round((Number(a.score || 0) / total) * 100);
      return pct < 70;
    }).length;

    const completedThisMonth = completionDocs.filter((p) => {
      const d = new Date(p.updatedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return res.json({
      nursesCount,
      coursesCount,
      modulesCount,
      questionsCount,
      pendingApprovals,
      nonCompliantCount,
      completedThisMonth,
      expiringSoonCount: 0,
      recentActivity,
    });
  } catch (err) {
    console.error("Error fetching admin dashboard summary", err);
    return res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

app.get("/api/nurse/dashboard-summary", requireAuth(), async (req, res) => {
  try {
    const current = req.user;
    const enrollments = await Enrollment.find({ userId: current._id })
      .select({ courseId: 1 })
      .lean()
      .exec();
    const courseIds = enrollments.map((e) => e.courseId);

    const [courses, modules, progressDocs, attempts] = await Promise.all([
      Course.find({
        _id: { $in: courseIds },
        status: "PUBLISHED",
      })
        .select({ _id: 1 })
        .lean()
        .exec(),
      Module.find({ courseId: { $in: courseIds } })
        .select({ _id: 1, courseId: 1 })
        .lean()
        .exec(),
      Progress.find({ userId: current._id })
        .select({ moduleId: 1, status: 1, quizPassed: 1 })
        .lean()
        .exec(),
      QuizAttempt.find({ userId: current._id }).lean().exec(),
    ]);

    const publishedCourseIds = new Set(courses.map((c) => String(c._id)));
    const relevantModules = modules.filter((m) =>
      publishedCourseIds.has(String(m.courseId))
    );
    const progressByModule = new Map(
      progressDocs.map((p) => [String(p.moduleId), p])
    );

    const totalModules = relevantModules.length;
    const completedModules = relevantModules.filter((m) => {
      const p = progressByModule.get(String(m._id));
      return normalizeProgressStatus(p?.status) === "COMPLETED";
    }).length;
    const inProgressModules = relevantModules.filter((m) => {
      const p = progressByModule.get(String(m._id));
      return normalizeProgressStatus(p?.status) === "IN_PROGRESS";
    }).length;

    const avgQuizScore = attempts.length
      ? Math.round(
          attempts.reduce((sum, a) => {
            const total = Number(a.totalQuestions || 0);
            const pct = total
              ? Math.round((Number(a.score || 0) / total) * 100)
              : Number(a.percent || 0);
            return sum + pct;
          }, 0) / attempts.length
        )
      : 0;

    const registeredCourses = courses.length;
    const courseSummaries = await Promise.all(
      courses.map(async (course) => {
        const courseModules = relevantModules.filter(
          (m) => String(m.courseId) === String(course._id)
        );
        const completed = courseModules.filter((m) => {
          const p = progressByModule.get(String(m._id));
          return normalizeProgressStatus(p?.status) === "COMPLETED";
        }).length;
        const progressPercent = courseModules.length
          ? Math.round((completed / courseModules.length) * 100)
          : 0;
        return {
          courseId: course._id,
          progressPercent,
          completedModules: completed,
          totalModules: courseModules.length,
        };
      })
    );

    return res.json({
      registeredCourses,
      totalModules,
      completedModules,
      inProgressModules,
      notStartedModules: Math.max(
        totalModules - completedModules - inProgressModules,
        0
      ),
      avgQuizScore,
      attemptsCount: attempts.length,
      courses: courseSummaries,
    });
  } catch (err) {
    console.error("Error fetching nurse dashboard summary", err);
    return res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

app.get("/api/admin/certifications/overview", requireAdmin(), async (req, res) => {
  try {
    const nurses = await User.find({ role: "nurse" })
      .select({ _id: 1, name: 1, department: 1 })
      .lean()
      .exec();
    const progressDocs = await Progress.find({ status: "completed" })
      .select({ userId: 1, updatedAt: 1 })
      .lean()
      .exec();

    const completedByUser = new Map();
    for (const p of progressDocs) {
      const key = String(p.userId);
      completedByUser.set(key, (completedByUser.get(key) || 0) + 1);
    }

    const logs = nurses.map((n, idx) => {
      const completed = completedByUser.get(String(n._id)) || 0;
      const status = completed >= 5 ? "active" : completed >= 1 ? "expiring" : "expired";
      const score = Math.min(100, 60 + completed * 8);
      return {
        id: idx + 1,
        nurse: n.name,
        department: n.department || "General",
        course: "Clinical Competency",
        completionDate: progressDocs[0]?.updatedAt || null,
        expiryDate: null,
        score,
        status,
      };
    });

    return res.json({
      totalCertified: logs.filter((x) => x.status === "active").length,
      expiringCount: logs.filter((x) => x.status === "expiring").length,
      nonCompliantCount: logs.filter((x) => x.status === "expired").length,
      completedThisMonth: progressDocs.length,
      logs,
    });
  } catch (err) {
    console.error("Error fetching certifications overview", err);
    return res.status(500).json({ message: "Failed to fetch certifications overview" });
  }
});

app.get("/api/nurse/assessments/overview", requireAuth(), async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const modules = await Module.find({}).select({ _id: 1, title: 1 }).lean().exec();
    const moduleById = new Map(modules.map((m) => [String(m._id), m]));

    const history = attempts.map((a, idx) => {
      const total = Number(a.totalQuestions || 0);
      const scorePct = total ? Math.round((Number(a.score || 0) / total) * 100) : 0;
      return {
        id: idx + 1,
        module: moduleById.get(String(a.moduleId))?.title || "Module",
        quiz: "Module Assessment",
        score: scorePct,
        status: scorePct >= (a.passingPercentage ?? 70) ? "passed" : "failed",
        date: a.createdAt,
      };
    });

    const passed = history.filter((h) => h.status === "passed").length;
    const failed = history.filter((h) => h.status === "failed").length;
    const avg = history.length
      ? Math.round(history.reduce((sum, h) => sum + Number(h.score || 0), 0) / history.length)
      : 0;

    return res.json({
      quizzesPassedPercent: history.length ? Math.round((passed / history.length) * 100) : 0,
      retakesPending: failed,
      avgScore: avg,
      history,
    });
  } catch (err) {
    console.error("Error fetching nurse assessments overview", err);
    return res.status(500).json({ message: "Failed to fetch assessments overview" });
  }
});

// Departments CRUD
app.get("/api/departments", requireAuth(), async (req, res) => {
  try {
    const depts = await Department.find({}).sort({ name: 1 }).lean().exec();
    res.json(depts);
  } catch (err) {
    console.error("Error fetching departments", err);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

app.post("/api/departments", requireAdmin(), async (req, res) => {
  try {
    const { name } = req.body || {};
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return res.status(400).json({ message: "Department name is required" });
    }
    const existing = await Department.findOne({ name: trimmed }).exec();
    if (existing) {
      return res.status(409).json({ message: "Department already exists" });
    }
    const created = await Department.create({ name: trimmed });
    return res.status(201).json(created);
  } catch (err) {
    console.error("Error creating department", err);
    res.status(500).json({ message: "Failed to create department" });
  }
});

app.put("/api/departments/:id", requireAdmin(), async (req, res) => {
  try {
    const { name } = req.body || {};
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return res.status(400).json({ message: "Department name is required" });
    }
    const updated = await Department.findByIdAndUpdate(
      req.params.id,
      { name: trimmed },
      { new: true }
    )
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating department", err);
    res.status(500).json({ message: "Failed to update department" });
  }
});

app.delete("/api/departments/:id", requireAdmin(), async (req, res) => {
  try {
    const deptId = req.params.id;
    const courseCount = await Course.countDocuments({ departmentId: deptId });
    if (courseCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete department with courses. Move or delete courses first.",
      });
    }
    const deleted = await Department.findByIdAndDelete(deptId).lean().exec();
    if (!deleted) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json({ message: "Department deleted" });
  } catch (err) {
    console.error("Error deleting department", err);
    res.status(500).json({ message: "Failed to delete department" });
  }
});

// Courses CRUD
app.get("/api/courses", requireAuth(), async (req, res) => {
  try {
    const { departmentId } = req.query;
    const query = departmentId ? { departmentId } : {};

    if (req.user.role === "nurse") {
      query.status = "PUBLISHED";
    } else if (req.user.role === "supervisor") {
      const userDeptId = await resolveUserDepartmentId(req.user);
      if (!userDeptId) {
        return res.json([]);
      }
      query.departmentId = userDeptId;
    } else if (departmentId && req.user.role === "supervisor") {
      const allowed = await canManageDepartment(req.user, departmentId);
      if (!allowed) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json(courses);
  } catch (err) {
    console.error("Error fetching courses", err);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

app.get("/api/courses/:id", requireAuth(), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean().exec();
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (req.user.role === "supervisor") {
      const { ok } = await canManageCourse(req.user, req.params.id);
      if (!ok) return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role === "nurse" && course.status !== "PUBLISHED") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(course);
  } catch (err) {
    console.error("Error fetching course", err);
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

app.post("/api/courses", requireAdminOrSupervisor(), async (req, res) => {
  try {
    let { departmentId, title, description } = req.body || {};
    const trimmedTitle = typeof title === "string" ? title.trim() : "";

    if (req.user.role === "supervisor") {
      departmentId = await resolveUserDepartmentId(req.user);
      if (!departmentId) {
        return res.status(400).json({ message: "Supervisor has no department assigned" });
      }
    }

    if (!departmentId || !trimmedTitle) {
      return res
        .status(400)
        .json({ message: "departmentId and title are required" });
    }

    const allowed = await canManageDepartment(req.user, departmentId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const deptExists = await Department.exists({ _id: departmentId });
    if (!deptExists) {
      return res.status(400).json({ message: "Invalid departmentId" });
    }

    const created = await Course.create({
      departmentId,
      title: trimmedTitle,
      description: typeof description === "string" ? description.trim() : "",
      status: "DRAFT",
      createdBy: req.user._id,
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating course", err);
    res.status(500).json({ message: "Failed to create course" });
  }
});

app.put("/api/courses/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const { ok, course } = await canManageCourse(req.user, req.params.id);
    if (!ok || !course) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (
      req.user.role === "supervisor" &&
      !["DRAFT", "REJECTED"].includes(course.status)
    ) {
      return res.status(403).json({
        message: "Course cannot be edited while pending approval or published",
      });
    }

    const { departmentId, title, description } = req.body || {};
    const update = {};
    if (departmentId && req.user.role === "admin") {
      const deptExists = await Department.exists({ _id: departmentId });
      if (!deptExists) {
        return res.status(400).json({ message: "Invalid departmentId" });
      }
      update.departmentId = departmentId;
    }
    if (typeof title === "string") {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ message: "title cannot be empty" });
      }
      update.title = trimmedTitle;
    }
    if (typeof description === "string") {
      update.description = description.trim();
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, update, {
      new: true,
    })
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating course", err);
    res.status(500).json({ message: "Failed to update course" });
  }
});

app.delete("/api/courses/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const { ok, course } = await canManageCourse(req.user, req.params.id);
    if (!ok || !course) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role === "supervisor" && course.status === "PUBLISHED") {
      return res.status(403).json({ message: "Cannot delete published courses" });
    }

    const courseId = req.params.id;
    const moduleCount = await Module.countDocuments({ courseId });
    if (moduleCount > 0) {
      return res.status(400).json({
        message: "Cannot delete course with modules. Delete modules first.",
      });
    }
    const deleted = await Course.findByIdAndDelete(courseId).lean().exec();
    if (!deleted) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error("Error deleting course", err);
    res.status(500).json({ message: "Failed to delete course" });
  }
});

app.patch("/api/courses/:id/publish", requireAdmin(), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean().exec();
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.status === "PENDING_APPROVAL") {
      return res.status(400).json({
        message: "Use the approval workflow for supervisor-submitted courses",
      });
    }
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      {
        status: "PUBLISHED",
        publishedAt: new Date(),
        approvedBy: req.user._id,
        approvalDate: new Date(),
      },
      { new: true }
    )
      .lean()
      .exec();
    res.json(updated);
  } catch (err) {
    console.error("Error publishing course", err);
    res.status(500).json({ message: "Failed to publish course" });
  }
});

app.patch("/api/courses/:id/draft", requireAdmin(), async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "DRAFT", publishedAt: null },
      { new: true }
    )
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error saving course draft", err);
    res.status(500).json({ message: "Failed to save course draft" });
  }
});

app.patch(
  "/api/courses/:id/submit-approval",
  requireAdminOrSupervisor(),
  async (req, res) => {
    try {
      if (req.user.role === "admin") {
        return res.status(403).json({
          message: "Admins publish courses directly; supervisors submit for approval",
        });
      }
      const { ok, course } = await canManageCourse(req.user, req.params.id);
      if (!ok || !course) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (!["DRAFT", "REJECTED"].includes(course.status)) {
        return res.status(400).json({
          message: "Only draft or rejected courses can be submitted for approval",
        });
      }

      const updated = await Course.findByIdAndUpdate(
        req.params.id,
        {
          status: "PENDING_APPROVAL",
          submittedAt: new Date(),
          rejectionReason: "",
        },
        { new: true }
      )
        .lean()
        .exec();

      await notifyAdminsOfCourseSubmission(updated, req.user);
      await AuditLog.create({
        action: "COURSE_SUBMITTED",
        courseId: updated._id,
        performedBy: req.user._id,
        details: { title: updated.title },
      });

      res.json(updated);
    } catch (err) {
      console.error("Error submitting course for approval", err);
      res.status(500).json({ message: "Failed to submit course for approval" });
    }
  }
);

app.get("/api/admin/pending-courses", requireAdmin(), async (req, res) => {
  try {
    const courses = await Course.find({ status: "PENDING_APPROVAL" })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
      .exec();

    const creatorIds = [
      ...new Set(courses.map((c) => String(c.createdBy)).filter(Boolean)),
    ];
    const deptIds = [
      ...new Set(courses.map((c) => String(c.departmentId)).filter(Boolean)),
    ];

    const [creators, departments] = await Promise.all([
      User.find({ _id: { $in: creatorIds } })
        .select("name email department")
        .lean()
        .exec(),
      Department.find({ _id: { $in: deptIds } })
        .select("name")
        .lean()
        .exec(),
    ]);

    const creatorMap = new Map(creators.map((u) => [String(u._id), u]));
    const deptMap = new Map(departments.map((d) => [String(d._id), d]));

    const rows = courses.map((course) => {
      const supervisor = creatorMap.get(String(course.createdBy));
      const dept = deptMap.get(String(course.departmentId));
      return {
        ...course,
        supervisorName: supervisor?.name || "Unknown",
        supervisorEmail: supervisor?.email || "",
        departmentName: dept?.name || "",
      };
    });

    res.json(rows);
  } catch (err) {
    console.error("Error fetching pending courses", err);
    res.status(500).json({ message: "Failed to fetch pending courses" });
  }
});

app.patch("/api/admin/courses/:id/approve", requireAdmin(), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).exec();
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Course is not pending approval" });
    }

    course.status = "PUBLISHED";
    course.publishedAt = new Date();
    course.approvedBy = req.user._id;
    course.approvalDate = new Date();
    course.rejectionReason = "";
    await course.save();

    await notifySupervisorCourseDecision(
      course.toObject(),
      course.createdBy,
      true
    );
    await AuditLog.create({
      action: "COURSE_APPROVED",
      courseId: course._id,
      performedBy: req.user._id,
      targetUserId: course.createdBy,
      details: { title: course.title },
    });

    res.json({
      message: "Course approved successfully.",
      course: course.toObject(),
    });
  } catch (err) {
    console.error("Error approving course", err);
    res.status(500).json({ message: "Failed to approve course" });
  }
});

app.patch("/api/admin/courses/:id/reject", requireAdmin(), async (req, res) => {
  try {
    const { rejectionReason } = req.body || {};
    const reason =
      typeof rejectionReason === "string" ? rejectionReason.trim() : "";

    const course = await Course.findById(req.params.id).exec();
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.status !== "PENDING_APPROVAL") {
      return res.status(400).json({ message: "Course is not pending approval" });
    }

    course.status = "REJECTED";
    course.rejectionReason = reason;
    course.publishedAt = null;
    await course.save();

    await notifySupervisorCourseDecision(
      course.toObject(),
      course.createdBy,
      false,
      reason
    );
    await AuditLog.create({
      action: "COURSE_REJECTED",
      courseId: course._id,
      performedBy: req.user._id,
      targetUserId: course.createdBy,
      details: { title: course.title, rejectionReason: reason },
    });

    res.json({
      message: "Course rejected.",
      course: course.toObject(),
    });
  } catch (err) {
    console.error("Error rejecting course", err);
    res.status(500).json({ message: "Failed to reject course" });
  }
});

app.get("/api/notifications", requireAuth(), async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

app.get("/api/notifications/unread-count", requireAuth(), async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    }).exec();
    res.json({ count });
  } catch (err) {
    console.error("Error counting notifications", err);
    res.status(500).json({ message: "Failed to count notifications" });
  }
});

app.patch("/api/notifications/:id/read", requireAuth(), async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    )
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error marking notification read", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

app.patch("/api/notifications/read-all", requireAuth(), async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    ).exec();
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications read", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

app.get("/api/supervisor/dashboard-summary", requireAdminOrSupervisor(), async (req, res) => {
  try {
    if (req.user.role !== "supervisor") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const deptId = await resolveUserDepartmentId(req.user);
    if (!deptId) {
      return res.json({
        departmentName: req.user.department,
        nurses: 0,
        courses: { draft: 0, pending: 0, published: 0, rejected: 0 },
        pendingApprovals: 0,
      });
    }

    const dept = await Department.findById(deptId).lean().exec();
    const nurseQuery = await filterUsersByDepartment(req.user, {});
    const [nurseCount, courses] = await Promise.all([
      User.countDocuments(nurseQuery).exec(),
      Course.find({ departmentId: deptId }).lean().exec(),
    ]);

    const stats = { draft: 0, pending: 0, published: 0, rejected: 0 };
    for (const c of courses) {
      if (c.status === "DRAFT") stats.draft += 1;
      else if (c.status === "PENDING_APPROVAL") stats.pending += 1;
      else if (c.status === "PUBLISHED") stats.published += 1;
      else if (c.status === "REJECTED") stats.rejected += 1;
    }

    res.json({
      departmentName: dept?.name || req.user.department,
      nurses: nurseCount,
      courses: stats,
      pendingApprovals: stats.pending,
    });
  } catch (err) {
    console.error("Error loading supervisor dashboard", err);
    res.status(500).json({ message: "Failed to load supervisor dashboard" });
  }
});

app.get("/api/supervisor/users", requireAdminOrSupervisor(), async (req, res) => {
  try {
    if (req.user.role !== "supervisor") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const query = await filterUsersByDepartment(req.user, { role: "nurse" });
    const users = await User.find(query)
      .select("-password")
      .sort({ name: 1 })
      .lean()
      .exec();
    res.json(users);
  } catch (err) {
    console.error("Error fetching supervisor users", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.use(
  "/api",
  buildModuleRoutes({
    requireAuth,
    requireAdmin: requireAdminOrSupervisor,
    moduleContentUpload,
  })
);

app.get("/api/modules/:id/content/download", requireAuth(), async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id).lean().exec();
    if (!mod) {
      return res.status(404).json({ message: "Module not found" });
    }
    const allowed = await canAccessModuleContent(req.user, String(mod._id));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const filename = mod.contentFile?.filename || "";
    if (!filename || !mod.contentFile?.data) {
      return res.status(404).json({ message: "No course content uploaded" });
    }

    res.setHeader(
      "Content-Type",
      mod.contentFile?.mimeType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${mod.contentFile?.originalName || "module-content"}"`
    );
    return res.send(mod.contentFile.data);
  } catch (err) {
    console.error("Error downloading module content", err);
    return res.status(500).json({ message: "Failed to download module content" });
  }
});

// User - change own password
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body || {};

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Email, old password, and new password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).exec();
    if (!user || user.password !== oldPassword) {
      return res
        .status(401)
        .json({ message: "Invalid email or password" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error changing password", err);
    return res.status(500).json({ message: "Failed to change password" });
  }
});

// Lessons (PDF/Video)
app.get("/api/modules/:moduleId/lessons", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const lessons = await Lesson.find({ moduleId: req.params.moduleId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const safe = lessons.map(({ filename, ...rest }) => ({
      ...rest,
      fileUrl:
        rest.type === "video"
          ? `/api/lessons/${rest._id}/stream`
          : `/api/lessons/${rest._id}/download`,
    }));
    res.json(safe);
  } catch (err) {
    console.error("Error fetching lessons", err);
    res.status(500).json({ message: "Failed to fetch lessons" });
  }
});

app.post(
  "/api/modules/:moduleId/lessons",
  requireAdminOrSupervisor(),
  lessonUpload.single("file"),
  async (req, res) => {
    try {
      const mod = await assertCanEditModule(req, res, req.params.moduleId);
      if (!mod) return;

      const { title } = req.body || {};
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title is required" });
      }

      const type = req.file.mimetype === "application/pdf" ? "pdf" : "video";

      const created = await Lesson.create({
        moduleId: req.params.moduleId,
        title: trimmedTitle,
        type,
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
        uploadedBy: req.user?.email || null,
      });

      const obj = created.toObject();
      const { filename, ...rest } = obj;
      return res.status(201).json({
        ...rest,
        fileUrl:
          rest.type === "video"
            ? `/api/lessons/${rest._id}/stream`
            : `/api/lessons/${rest._id}/download`,
      });
    } catch (err) {
      console.error("Error uploading lesson", err);
      res.status(500).json({ message: "Failed to upload lesson" });
    }
  }
);

app.delete("/api/lessons/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean().exec();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const mod = await assertCanEditModule(req, res, String(lesson.moduleId));
    if (!mod) return;
    await Lesson.deleteOne({ _id: lesson._id });
    res.json({ message: "Lesson deleted" });
  } catch (err) {
    console.error("Error deleting lesson", err);
    res.status(500).json({ message: "Failed to delete lesson" });
  }
});

app.get("/api/lessons/:id/download", requireAuth(), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean().exec();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const allowed = await canAccessModuleContent(req.user, String(lesson.moduleId));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!lesson.data) return res.status(404).json({ message: "File not found" });
    res.setHeader("Content-Type", lesson.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${lesson.originalName}"`
    );
    return res.send(lesson.data);
  } catch (err) {
    console.error("Error downloading lesson", err);
    res.status(500).json({ message: "Failed to download lesson" });
  }
});

app.get("/api/lessons/:id/stream", requireAuth(), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean().exec();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const allowed = await canAccessModuleContent(req.user, String(lesson.moduleId));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!lesson.data) {
      return res.status(404).json({ message: "File not found" });
    }
    const dataBuffer = Buffer.from(lesson.data.buffer || lesson.data);
    const size = dataBuffer.length;
    const range = req.headers.range;
    const contentType = lesson.mimeType || "video/mp4";

    if (!range) {
      res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": contentType,
      });
      res.end(dataBuffer);
      return;
    }

    const parts = String(range).replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });
    res.end(dataBuffer.subarray(start, end + 1));
  } catch (err) {
    console.error("Error streaming lesson", err);
    res.status(500).json({ message: "Failed to stream lesson" });
  }
});

// SOPs (PDF only)
app.get("/api/modules/:moduleId/sops", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const sops = await SOP.find({ moduleId: req.params.moduleId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const safe = sops.map(({ filename, ...rest }) => ({
      ...rest,
      fileUrl: `/api/sops/${rest._id}/download`,
    }));
    res.json(safe);
  } catch (err) {
    console.error("Error fetching sops", err);
    res.status(500).json({ message: "Failed to fetch SOPs" });
  }
});

app.post(
  "/api/modules/:moduleId/sops",
  requireAdminOrSupervisor(),
  sopPdfUpload.single("file"),
  async (req, res) => {
    try {
      const mod = await assertCanEditModule(req, res, req.params.moduleId);
      if (!mod) return;

      const { title } = req.body || {};
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title is required" });
      }

      const created = await SOP.create({
        moduleId: req.params.moduleId,
        title: trimmedTitle,
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
        uploadedBy: req.user?.email || null,
      });

      const obj = created.toObject();
      const { filename, ...rest } = obj;
      return res.status(201).json({
        ...rest,
        fileUrl: `/api/sops/${rest._id}/download`,
      });
    } catch (err) {
      console.error("Error uploading sop", err);
      res.status(500).json({ message: "Failed to upload SOP" });
    }
  }
);

app.delete("/api/sops/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const sop = await SOP.findById(req.params.id).lean().exec();
    if (!sop) return res.status(404).json({ message: "SOP not found" });
    const mod = await assertCanEditModule(req, res, String(sop.moduleId));
    if (!mod) return;
    await SOP.deleteOne({ _id: sop._id });
    res.json({ message: "SOP deleted" });
  } catch (err) {
    console.error("Error deleting sop", err);
    res.status(500).json({ message: "Failed to delete SOP" });
  }
});

app.get("/api/sops/:id/download", requireAuth(), async (req, res) => {
  try {
    const sop = await SOP.findById(req.params.id).lean().exec();
    if (!sop) return res.status(404).json({ message: "SOP not found" });
    const allowed = await canAccessModuleContent(req.user, String(sop.moduleId));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!sop.data) return res.status(404).json({ message: "File not found" });
    res.setHeader("Content-Type", sop.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sop.originalName}"`
    );
    return res.send(sop.data);
  } catch (err) {
    console.error("Error downloading sop", err);
    res.status(500).json({ message: "Failed to download SOP" });
  }
});

// Admin - enroll user into course
app.post("/api/admin/enrollments", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const { userEmail, userId, courseId } = req.body || {};
    let user = null;
    if (userId) {
      user = await User.findById(userId).exec();
    } else {
      const normalizedEmail =
        typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
      if (!normalizedEmail) {
        return res.status(400).json({ message: "userEmail or userId is required" });
      }
      user = await User.findOne({ email: normalizedEmail }).exec();
    }
    if (!user) {
      return res.status(400).json({ message: "Invalid nurse user" });
    }
    if (user.role !== "nurse") {
      return res.status(400).json({ message: "Only nurses can be registered to courses" });
    }
    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }
    const course = await Course.findById(courseId).lean().exec();
    if (!course) {
      return res.status(400).json({ message: "Invalid courseId" });
    }
    if (req.user.role === "supervisor") {
      const nurseQuery = await filterUsersByDepartment(req.user, { _id: user._id });
      const nurseAllowed = await User.exists(nurseQuery);
      if (!nurseAllowed) {
        return res.status(403).json({ message: "Nurse is outside your department" });
      }
      const { ok } = await canManageCourse(req.user, courseId);
      if (!ok) {
        return res.status(403).json({ message: "Course is outside your department" });
      }
      if (course.status !== "PUBLISHED") {
        return res.status(400).json({
          message: "Only published courses can be assigned to nurses",
        });
      }
    }
    const created = await Enrollment.create({
      userId: user._id,
      courseId,
      registeredBy: req.user._id,
      registeredAt: new Date(),
    });
    const populated = await Enrollment.findById(created._id)
      .populate("userId", "name email empId department")
      .populate("courseId", "title status")
      .populate("registeredBy", "name email")
      .lean()
      .exec();
    res.status(201).json(populated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Nurse is already registered for this course" });
    }
    console.error("Error creating enrollment", err);
    res.status(500).json({ message: "Failed to create enrollment" });
  }
});

app.get("/api/admin/enrollments", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const query = {};
    if (req.query.courseId) query.courseId = req.query.courseId;
    if (req.query.userId) query.userId = req.query.userId;

    let enrollments = await Enrollment.find(query)
      .sort({ registeredAt: -1 })
      .populate("userId", "name email empId department")
      .populate("courseId", "title status departmentId")
      .populate("registeredBy", "name email")
      .lean()
      .exec();

    if (req.user.role === "supervisor") {
      const deptId = await resolveUserDepartmentId(req.user);
      const dept = deptId
        ? await Department.findById(deptId).lean().exec()
        : null;
      const deptName = dept?.name || req.user.department;
      enrollments = enrollments.filter((e) => {
        const nurse = e.userId;
        const course = e.courseId;
        if (!nurse || !course) return false;
        const nurseInDept =
          String(nurse.departmentId || "") === String(deptId) ||
          nurse.department === deptName;
        const courseInDept = String(course.departmentId || "") === String(deptId);
        return nurseInDept && courseInDept;
      });
    }

    res.json(enrollments);
  } catch (err) {
    console.error("Error fetching enrollments", err);
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

app.get("/api/nurse/my-courses", requireAuth(), async (req, res) => {
  try {
    if (req.user.role !== "nurse") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const enrollments = await Enrollment.find({ userId: req.user._id })
      .sort({ registeredAt: -1 })
      .lean()
      .exec();
    const courseIds = enrollments.map((e) => e.courseId);

    const [courses, departments, allModules, progressDocs] = await Promise.all([
      Course.find({
        _id: { $in: courseIds },
        status: "PUBLISHED",
      })
        .lean()
        .exec(),
      Department.find({}).select({ _id: 1, name: 1 }).lean().exec(),
      Module.find({ courseId: { $in: courseIds } })
        .select({ _id: 1, courseId: 1, order: 1 })
        .lean()
        .exec(),
      Progress.find({ userId: req.user._id })
        .select({ moduleId: 1, status: 1, quizPassed: 1, percent: 1 })
        .lean()
        .exec(),
    ]);

    const deptById = new Map(departments.map((d) => [String(d._id), d]));
    const progressByModule = new Map(
      progressDocs.map((p) => [String(p.moduleId), p])
    );
    const enrollmentByCourse = new Map(
      enrollments.map((e) => [String(e.courseId), e])
    );

    const payload = courses.map((course) => {
      const courseModules = allModules
        .filter((m) => String(m.courseId) === String(course._id))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const completedCount = courseModules.filter((m) => {
        const p = progressByModule.get(String(m._id));
        return normalizeProgressStatus(p?.status) === "COMPLETED";
      }).length;
      const progressPercent = courseModules.length
        ? Math.round((completedCount / courseModules.length) * 100)
        : 0;
      const enrollment = enrollmentByCourse.get(String(course._id));

      return {
        _id: course._id,
        title: course.title,
        description: course.description || "",
        status: course.status || "PUBLISHED",
        department: deptById.get(String(course.departmentId)) || null,
        registeredAt: enrollment?.registeredAt || enrollment?.createdAt || null,
        totalModules: courseModules.length,
        completedModules: completedCount,
        progressPercent,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("Error fetching nurse courses", err);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

app.get("/api/nurse/courses/:courseId/modules", requireAuth(), async (req, res) => {
  try {
    if (req.user.role !== "nurse") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const courseId = req.params.courseId;
    const enrolled = await isEnrolledInCourse(req.user._id, courseId);
    if (!enrolled) {
      return res.status(403).json({
        message: "You are not registered for this course.",
        notRegistered: true,
      });
    }

    const course = await Course.findById(courseId).lean().exec();
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!isCoursePublished(course)) {
      return res.status(403).json({ message: "This course is not available yet." });
    }

    const modules = await getCourseModulesOrdered(courseId);
    const moduleIds = modules.map((m) => m._id);
    const [progressMap, countsMap, department] = await Promise.all([
      getProgressMap(req.user._id, moduleIds),
      getContentCountsByModule(moduleIds),
      Department.findById(course.departmentId).select({ _id: 1, name: 1 }).lean().exec(),
    ]);

    const modulePayload = await buildModuleProgressPayload({
      userId: req.user._id,
      courseId,
      modules,
      progressMap,
      countsMap,
    });

    const completedCount = modulePayload.filter((m) => m.status === "COMPLETED").length;
    const progressPercent = modules.length
      ? Math.round((completedCount / modules.length) * 100)
      : 0;

    res.json({
      course: {
        _id: course._id,
        title: course.title,
        description: course.description || "",
        department,
        progressPercent,
        completedModules: completedCount,
        totalModules: modules.length,
      },
      modules: modulePayload,
    });
  } catch (err) {
    console.error("Error fetching course modules", err);
    res.status(500).json({ message: "Failed to fetch course modules" });
  }
});

// Admin - assign modules (or full course) to nurses
app.post("/api/assignments", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const { nurseIds, courseId, moduleIds, dueDate } = req.body || {};
    if (!Array.isArray(nurseIds) || nurseIds.length === 0 || !courseId) {
      return res
        .status(400)
        .json({ message: "nurseIds[] and courseId are required" });
    }

    const course = await Course.findById(courseId).lean().exec();
    if (!course) {
      return res.status(400).json({ message: "Invalid courseId" });
    }

    if (req.user.role === "supervisor") {
      const { ok } = await canManageCourse(req.user, courseId);
      if (!ok) {
        return res.status(403).json({ message: "Course is outside your department" });
      }
      if (course.status !== "PUBLISHED") {
        return res.status(400).json({
          message: "Only published courses can be assigned",
        });
      }
    }

    const nurseQuery =
      req.user.role === "supervisor"
        ? await filterUsersByDepartment(req.user, {
            _id: { $in: nurseIds },
            role: "nurse",
          })
        : { _id: { $in: nurseIds }, role: "nurse" };

    const nurses = await User.find(nurseQuery)
      .select({ _id: 1 })
      .lean()
      .exec();
    if (!nurses.length) {
      return res.status(400).json({ message: "No valid nurse users provided" });
    }

    let selectedModuleIds = Array.isArray(moduleIds) ? moduleIds : [];
    if (selectedModuleIds.length === 0) {
      const allCourseModules = await Module.find({ courseId })
        .select({ _id: 1 })
        .lean()
        .exec();
      selectedModuleIds = allCourseModules.map((m) => m._id);
    }

    const validModules = await Module.find({
      _id: { $in: selectedModuleIds },
      courseId,
    })
      .select({ _id: 1 })
      .lean()
      .exec();
    if (!validModules.length) {
      return res.status(400).json({ message: "No valid modules selected" });
    }

    const dueDateValue = dueDate ? new Date(dueDate) : null;
    if (dueDate && Number.isNaN(dueDateValue?.getTime())) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }

    const operations = [];
    for (const nurse of nurses) {
      for (const mod of validModules) {
        operations.push({
          updateOne: {
            filter: { nurseId: nurse._id, moduleId: mod._id },
            update: {
              $set: {
                courseId,
                assignedBy: req.user._id,
                assignedAt: new Date(),
                ...(dueDateValue ? { dueDate: dueDateValue } : {}),
              },
              $setOnInsert: {
                status: "NOT_STARTED",
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (operations.length) {
      await ModuleAssignment.bulkWrite(operations, { ordered: false });
    }

    return res.status(201).json({ message: "Modules assigned successfully" });
  } catch (err) {
    console.error("Error assigning modules", err);
    return res.status(500).json({ message: "Failed to assign modules" });
  }
});

// Admin - list assignments
app.get("/api/assignments", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const query = {};
    if (req.query.nurseId) {
      query.nurseId = req.query.nurseId;
    }
    const assignments = await ModuleAssignment.find(query)
      .sort({ assignedAt: -1 })
      .populate("nurseId", "name email department")
      .populate("courseId", "title")
      .populate("moduleId", "title order")
      .lean()
      .exec();
    return res.json(assignments);
  } catch (err) {
    console.error("Error fetching assignments", err);
    return res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

// Nurse - list my assigned modules
app.get("/api/assignments/my-modules", requireAuth(), async (req, res) => {
  try {
    const current = req.user;
    if (current.role !== "nurse") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const assignments = await ModuleAssignment.find({ nurseId: current._id })
      .sort({ assignedAt: -1 })
      .populate("courseId", "title departmentId")
      .populate("moduleId", "title order estimatedDuration")
      .lean()
      .exec();

    const departmentIds = assignments
      .map((a) => a?.courseId?.departmentId)
      .filter(Boolean);
    const departments = await Department.find({ _id: { $in: departmentIds } })
      .select({ _id: 1, name: 1 })
      .lean()
      .exec();
    const deptById = new Map(departments.map((d) => [String(d._id), d]));

    const payload = assignments
      .filter((a) => a.courseId && a.moduleId)
      .map((a) => ({
        _id: a._id,
        courseId: a.courseId._id,
        moduleId: a.moduleId._id,
        assignedAt: a.assignedAt,
        dueDate: a.dueDate || null,
        status: a.status,
        course: {
          _id: a.courseId._id,
          title: a.courseId.title,
          departmentId: a.courseId.departmentId,
        },
        module: {
          _id: a.moduleId._id,
          title: a.moduleId.title,
          order: a.moduleId.order,
          estimatedDuration: a.moduleId.estimatedDuration || "",
        },
        department: a.courseId?.departmentId
          ? deptById.get(String(a.courseId.departmentId)) || null
          : null,
      }));

    return res.json(payload);
  } catch (err) {
    console.error("Error fetching my assigned modules", err);
    return res.status(500).json({ message: "Failed to fetch assigned modules" });
  }
});

// Nurse/Admin - update assignment status; Admin can also update due date
app.patch("/api/assignments/:id", requireAuth(), async (req, res) => {
  try {
    const { status, dueDate } = req.body || {};
    const assignment = await ModuleAssignment.findById(req.params.id).exec();
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const isOwner = String(assignment.nurseId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (typeof status === "string") {
      const allowed = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const currentStatus = assignment.status;
      const validTransition =
        currentStatus === status ||
        (currentStatus === "NOT_STARTED" && status === "IN_PROGRESS") ||
        (currentStatus === "IN_PROGRESS" && status === "COMPLETED");
      if (!validTransition) {
        return res.status(400).json({
          message:
            "Invalid status transition. Allowed: NOT_STARTED -> IN_PROGRESS -> COMPLETED",
        });
      }
      assignment.status = status;
    }

    if (isAdmin && dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        assignment.dueDate = null;
      } else {
        const parsed = new Date(dueDate);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate" });
        }
        assignment.dueDate = parsed;
      }
    }

    await assignment.save();
    return res.json(assignment.toObject());
  } catch (err) {
    console.error("Error updating assignment", err);
    return res.status(500).json({ message: "Failed to update assignment" });
  }
});

// Admin - remove assignment
app.delete("/api/assignments/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const deleted = await ModuleAssignment.findByIdAndDelete(req.params.id)
      .lean()
      .exec();
    if (!deleted) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    return res.json({ message: "Assignment removed" });
  } catch (err) {
    console.error("Error removing assignment", err);
    return res.status(500).json({ message: "Failed to remove assignment" });
  }
});

// Learner/Admin - list modules available to current user
app.get("/api/me/modules", requireAuth(), async (req, res) => {
  try {
    const current = req.user;
    const isAdmin = current.role === "admin";

    let courseIds = [];
    let assignedModuleIds = [];
    let assignmentByModuleId = new Map();
    if (isAdmin) {
      const allCourses = await Course.find({}).select({ _id: 1 }).lean().exec();
      courseIds = allCourses.map((c) => c._id);
    } else {
      const assignments = await ModuleAssignment.find({ nurseId: current._id })
        .select({ courseId: 1, moduleId: 1, status: 1, dueDate: 1 })
        .lean()
        .exec();
      assignedModuleIds = assignments.map((a) => a.moduleId);
      courseIds = [...new Set(assignments.map((a) => String(a.courseId)))];
      assignmentByModuleId = new Map(
        assignments.map((a) => [String(a.moduleId), a])
      );
    }

    const courses = await Course.find({ _id: { $in: courseIds } })
      .lean()
      .exec();
    const departments = await Department.find({}).lean().exec();
    const deptById = new Map(departments.map((d) => [String(d._id), d]));
    const courseById = new Map(courses.map((c) => [String(c._id), c]));

    const moduleQuery = isAdmin
      ? { courseId: { $in: courseIds } }
      : { _id: { $in: assignedModuleIds } };
    const modules = await Module.find(moduleQuery)
      .sort({ order: 1 })
      .lean()
      .exec();

    const progressDocs = await Progress.find({ userId: current._id })
      .lean()
      .exec();
    const progressByModuleId = new Map(
      progressDocs.map((p) => [String(p.moduleId), p])
    );

    const result = modules.map((m) => {
      const course = courseById.get(String(m.courseId));
      const dept = course ? deptById.get(String(course.departmentId)) : null;
      const progress = isAdmin
        ? progressByModuleId.get(String(m._id))
        : assignmentByModuleId.get(String(m._id));
      const progressMapped = isAdmin
        ? progress
          ? { status: progress.status, percent: progress.percent }
          : { status: "not-started", percent: 0 }
        : mapAssignmentStatusToProgress(progress?.status);
      return {
        _id: m._id,
        title: m.title,
        order: m.order,
        course: course
          ? { _id: course._id, title: course.title, departmentId: course.departmentId }
          : null,
        department: dept ? { _id: dept._id, name: dept.name } : null,
        dueDate: progress?.dueDate || null,
        progress: progressMapped,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching my modules", err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

// Learner/Admin - update progress for a module
app.post("/api/modules/:moduleId/progress", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const mod = await Module.findById(req.params.moduleId).lean().exec();
    if (!mod) {
      return res.status(404).json({ message: "Module not found" });
    }

    const progressDoc = await getOrCreateProgress(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    const updated = await checkAndUpdateCompletion(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );

    res.json({
      status: updated.status,
      percent: updated.percent,
      quizPassed: updated.quizPassed,
      quizScore: updated.quizScore,
    });
  } catch (err) {
    console.error("Error updating progress", err);
    res.status(500).json({ message: "Failed to update progress" });
  }
});

app.post("/api/modules/:moduleId/progress/view-lesson", requireAuth(), async (req, res) => {
  try {
    const { lessonId } = req.body || {};
    if (!lessonId) {
      return res.status(400).json({ message: "lessonId is required" });
    }
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const lesson = await Lesson.findById(lessonId).lean().exec();
    if (!lesson || String(lesson.moduleId) !== String(req.params.moduleId)) {
      return res.status(400).json({ message: "Invalid lessonId" });
    }

    const mod = await Module.findById(req.params.moduleId).lean().exec();
    const progressDoc = await getOrCreateProgress(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    const viewed = new Set((progressDoc.lessonsViewed || []).map(String));
    viewed.add(String(lessonId));
    progressDoc.lessonsViewed = [...viewed];
    if (progressDoc.status === "NOT_STARTED") {
      progressDoc.status = "IN_PROGRESS";
    }
    await progressDoc.save();
    const updated = await checkAndUpdateCompletion(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    res.json({ message: "Lesson marked as viewed", progress: updated });
  } catch (err) {
    console.error("Error marking lesson viewed", err);
    res.status(500).json({ message: "Failed to update lesson progress" });
  }
});

app.post("/api/modules/:moduleId/progress/view-sop", requireAuth(), async (req, res) => {
  try {
    const { sopId } = req.body || {};
    if (!sopId) {
      return res.status(400).json({ message: "sopId is required" });
    }
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const sop = await SOP.findById(sopId).lean().exec();
    if (!sop || String(sop.moduleId) !== String(req.params.moduleId)) {
      return res.status(400).json({ message: "Invalid sopId" });
    }

    const mod = await Module.findById(req.params.moduleId).lean().exec();
    const progressDoc = await getOrCreateProgress(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    const viewed = new Set((progressDoc.sopsViewed || []).map(String));
    viewed.add(String(sopId));
    progressDoc.sopsViewed = [...viewed];
    if (progressDoc.status === "NOT_STARTED") {
      progressDoc.status = "IN_PROGRESS";
    }
    await progressDoc.save();
    const updated = await checkAndUpdateCompletion(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    res.json({ message: "SOP marked as viewed", progress: updated });
  } catch (err) {
    console.error("Error marking SOP viewed", err);
    res.status(500).json({ message: "Failed to update SOP progress" });
  }
});

app.post("/api/modules/:moduleId/progress/view-content", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const mod = await Module.findById(req.params.moduleId).lean().exec();
    if (!mod) {
      return res.status(404).json({ message: "Module not found" });
    }

    const progressDoc = await getOrCreateProgress(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    progressDoc.contentViewed = true;
    if (progressDoc.status === "NOT_STARTED") {
      progressDoc.status = "IN_PROGRESS";
    }
    await progressDoc.save();
    const updated = await checkAndUpdateCompletion(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    res.json({ message: "Module content marked as viewed", progress: updated });
  } catch (err) {
    console.error("Error marking content viewed", err);
    res.status(500).json({ message: "Failed to update content progress" });
  }
});

app.get("/api/modules/:moduleId/progress/me", requireAuth(), async (req, res) => {
  try {
    const mod = await Module.findById(req.params.moduleId).lean().exec();
    if (!mod) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (req.user.role === "nurse") {
      const enrolled = await isEnrolledInCourse(req.user._id, mod.courseId);
      if (!enrolled) {
        return res.status(403).json({ message: "You are not registered for this course." });
      }
    }

    const modules = await getCourseModulesOrdered(mod.courseId);
    const progressMap = await getProgressMap(
      req.user._id,
      modules.map((m) => m._id)
    );
    const countsMap = await getContentCountsByModule([mod._id]);
    const progress = progressMap.get(String(mod._id)) || null;
    const counts = countsMap.get(String(mod._id)) || {
      lessonCount: 0,
      sopCount: 0,
      hasContent: false,
    };
    const unlocked =
      req.user.role === "admin" ||
      isPreviousModuleCompleted(mod, modules, progressMap);

    res.json({
      status: deriveDisplayStatus(progress, unlocked),
      unlocked,
      percent: progress ? computeProgressPercent(progress, counts) : 0,
      quizPassed: !!progress?.quizPassed,
      quizScore: progress?.quizScore ?? null,
      quizAttemptsCount: progress?.quizAttemptsCount ?? 0,
      lessonsViewed: progress?.lessonsViewed || [],
      sopsViewed: progress?.sopsViewed || [],
      contentViewed: !!progress?.contentViewed,
      passingPercentage: mod.passingPercentage ?? 70,
      maxQuizAttempts: mod.maxQuizAttempts ?? null,
      contentRequirements: {
        lessonsTotal: counts.lessonCount,
        sopsTotal: counts.sopCount,
        contentRequired: counts.hasContent,
      },
    });
  } catch (err) {
    console.error("Error fetching module progress", err);
    res.status(500).json({ message: "Failed to fetch module progress" });
  }
});

// Upload PDF for nurse (admin)
app.post(
  "/api/nurse-files",
  nursePdfUpload.single("file"),
  async (req, res) => {
    try {
      const { nurseEmail, title, uploadedBy } = req.body;
      if (!req.file) {
        return res.status(400).json({ message: "PDF file is required" });
      }
      if (!nurseEmail || !title) {
        return res
          .status(400)
          .json({ message: "nurseEmail and title are required" });
      }

      const fileDoc = await NurseFile.create({
        nurseEmail,
        title,
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer,
        uploadedBy: uploadedBy || null,
      });

      res.status(201).json(fileDoc);
    } catch (err) {
      console.error("Error uploading nurse file", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  }
);

// List nurse files (optionally filter by nurseEmail)
app.get("/api/nurse-files", async (req, res) => {
  try {
    const { nurseEmail } = req.query;
    const query = nurseEmail ? { nurseEmail } : {};
    const files = await NurseFile.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json(files);
  } catch (err) {
    console.error("Error fetching nurse files", err);
    res.status(500).json({ message: "Failed to fetch files" });
  }
});

// Download a specific nurse file by id
app.get("/api/nurse-files/:id/download", async (req, res) => {
  try {
    const fileDoc = await NurseFile.findById(req.params.id).exec();
    if (!fileDoc) {
      return res.status(404).json({ message: "File not found" });
    }
    if (!fileDoc.data) {
      return res.status(404).json({ message: "File data not found" });
    }
    res.setHeader("Content-Type", fileDoc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileDoc.originalName}"`);
    return res.send(fileDoc.data);
  } catch (err) {
    console.error("Error downloading nurse file", err);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// Question Bank - Admin: Get all questions for a module
app.get("/api/modules/:moduleId/questions", requireAuth(), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      // For learners, don't show correct answers
      return res.status(403).json({ message: "Forbidden" });
    }
    const questions = await Question.find({ moduleId: req.params.moduleId })
      .sort({ order: 1 })
      .lean()
      .exec();
    res.json(questions);
  } catch (err) {
    console.error("Error fetching questions", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

// Question Bank - Get questions for learner (without correct answers)
app.get("/api/modules/:moduleId/questions/learner", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const questions = await Question.find({ moduleId: req.params.moduleId })
      .sort({ order: 1 })
      .lean()
      .exec();

    // Remove correctAnswer for learners and ensure true/false questions always have options.
    const safe = questions.map(({ correctAnswer, ...rest }) => ({
      ...rest,
      options:
        rest.type === "true-false" &&
        (!Array.isArray(rest.options) || rest.options.length < 2)
          ? ["True", "False"]
          : rest.options,
    }));
    res.json(safe);
  } catch (err) {
    console.error("Error fetching questions", err);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

// Question Bank - Admin: Create a question
app.post("/api/modules/:moduleId/questions", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const mod = await assertCanEditModule(req, res, req.params.moduleId);
    if (!mod) return;

    const { question, type, options, correctAnswer } = req.body || {};

    if (!question || !type || !correctAnswer) {
      return res.status(400).json({ message: "question, type, and correctAnswer are required" });
    }

    if (!["mcq", "true-false"].includes(type)) {
      return res.status(400).json({ message: "Invalid question type" });
    }

    if (type === "mcq" && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ message: "MCQ requires at least 2 options" });
    }

    // Get the next order number
    const lastQuestion = await Question.findOne({ moduleId: req.params.moduleId })
      .sort({ order: -1 })
      .lean()
      .exec();
    const order = (lastQuestion?.order || 0) + 1;

    const created = await Question.create({
      moduleId: req.params.moduleId,
      question: question.trim(),
      type,
      options:
        type === "mcq"
          ? options.map((o) => String(o).trim())
          : ["True", "False"],
      correctAnswer: String(correctAnswer).trim(),
      order,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating question", err);
    res.status(500).json({ message: "Failed to create question" });
  }
});

// Question Bank - Admin: Update a question
app.put("/api/questions/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const existing = await Question.findById(req.params.id).lean().exec();
    if (!existing) {
      return res.status(404).json({ message: "Question not found" });
    }
    const mod = await assertCanEditModule(req, res, String(existing.moduleId));
    if (!mod) return;

    const { question, type, options, correctAnswer } = req.body || {};

    const updates = {};
    if (question) updates.question = question.trim();
    if (type) {
      if (!["mcq", "true-false"].includes(type)) {
        return res.status(400).json({ message: "Invalid question type" });
      }
      updates.type = type;
    }
    if (options) {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "MCQ requires at least 2 options" });
      }
      updates.options = options.map(o => String(o).trim());
    }
    if (correctAnswer) updates.correctAnswer = String(correctAnswer).trim();

    const updated = await Question.findByIdAndUpdate(req.params.id, updates, { new: true }).lean().exec();
    if (!updated) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating question", err);
    res.status(500).json({ message: "Failed to update question" });
  }
});

// Question Bank - Admin: Delete a question
app.delete("/api/questions/:id", requireAdminOrSupervisor(), async (req, res) => {
  try {
    const existing = await Question.findById(req.params.id).lean().exec();
    if (!existing) {
      return res.status(404).json({ message: "Question not found" });
    }
    const mod = await assertCanEditModule(req, res, String(existing.moduleId));
    if (!mod) return;

    const deleted = await Question.findByIdAndDelete(req.params.id).lean().exec();
    if (!deleted) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error("Error deleting question", err);
    res.status(500).json({ message: "Failed to delete question" });
  }
});

app.post("/api/questions/:id/check", requireAuth(), async (req, res) => {
  try {
    const { selectedAnswer } = req.body || {};
    const answer = typeof selectedAnswer === "string" ? selectedAnswer.trim() : "";
    if (!answer) {
      return res.status(400).json({ message: "selectedAnswer is required" });
    }

    const question = await Question.findById(req.params.id).lean().exec();
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const allowed = await canAccessModuleContent(req.user, String(question.moduleId));
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const correct = String(question.correctAnswer || "").trim();
    const isCorrect = answer.toLowerCase() === correct.toLowerCase();
    return res.json({ isCorrect, correctAnswer: correct });
  } catch (err) {
    console.error("Error checking answer", err);
    return res.status(500).json({ message: "Failed to check answer" });
  }
});

// Quiz Attempt - Learner: Submit quiz answers
app.post("/api/modules/:moduleId/quiz-attempt", requireAuth(), async (req, res) => {
  try {
    const { answers } = req.body || {};

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers array is required" });
    }

    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const mod = await Module.findById(req.params.moduleId).lean().exec();
    if (!mod) {
      return res.status(404).json({ message: "Module not found" });
    }

    const passingPercentage = mod.passingPercentage ?? 70;
    const maxAttempts = mod.maxQuizAttempts ?? null;
    const attemptCount = await getLatestQuizAttemptCount(
      req.user._id,
      req.params.moduleId
    );
    if (maxAttempts !== null && attemptCount >= maxAttempts) {
      return res.status(403).json({
        message: `Maximum quiz attempts (${maxAttempts}) reached.`,
        attemptsUsed: attemptCount,
        maxAttempts,
      });
    }

    const questions = await Question.find({ moduleId: req.params.moduleId }).lean().exec();
    if (!questions.length) {
      return res.status(400).json({ message: "This module has no quiz questions yet." });
    }

    const questionMap = new Map(questions.map((q) => [String(q._id), q]));

    let correctCount = 0;
    const scoredAnswers = answers.map(({ questionId, selectedAnswer }) => {
      const question = questionMap.get(String(questionId));
      const isCorrect =
        !!question &&
        String(selectedAnswer || "").trim().toLowerCase() ===
          String(question.correctAnswer || "").trim().toLowerCase();
      if (isCorrect) correctCount++;
      return {
        questionId,
        selectedAnswer,
        isCorrect: !!isCorrect,
        correctAnswer: question ? question.correctAnswer : null,
      };
    });

    const percent = questions.length
      ? Math.round((correctCount / questions.length) * 100)
      : 0;
    const passed = percent >= passingPercentage;

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      moduleId: req.params.moduleId,
      answers: scoredAnswers,
      score: correctCount,
      totalQuestions: questions.length,
      percent,
      passed,
      passingPercentage,
    });

    const progressDoc = await getOrCreateProgress(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );
    progressDoc.quizAttemptsCount = (progressDoc.quizAttemptsCount || 0) + 1;
    progressDoc.quizScore = percent;
    if (passed) {
      progressDoc.quizPassed = true;
    }
    if (progressDoc.status === "NOT_STARTED") {
      progressDoc.status = "IN_PROGRESS";
    }
    await progressDoc.save();

    const updatedProgress = await checkAndUpdateCompletion(
      req.user._id,
      req.params.moduleId,
      mod.courseId
    );

    await ModuleAssignment.findOneAndUpdate(
      { nurseId: req.user._id, moduleId: req.params.moduleId },
      {
        $set: {
          status:
            updatedProgress.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        },
      }
    ).exec();

    res.status(201).json({
      _id: attempt._id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percent,
      passed,
      passingPercentage,
      moduleCompleted: updatedProgress.status === "COMPLETED",
      nextModuleUnlocked: passed && updatedProgress.status === "COMPLETED",
      attemptsUsed: progressDoc.quizAttemptsCount,
      maxAttempts,
      answers: scoredAnswers,
    });
  } catch (err) {
    console.error("Error submitting quiz attempt", err);
    res.status(500).json({ message: "Failed to submit quiz" });
  }
});

// Quiz Attempt - Learner: Get latest quiz attempt for a module
app.get("/api/modules/:moduleId/quiz-attempt", requireAuth(), async (req, res) => {
  try {
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const attempt = await QuizAttempt.findOne({
      userId: req.user._id,
      moduleId: req.params.moduleId,
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!attempt) {
      return res.json(null);
    }

    res.json({
      _id: attempt._id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percent: attempt.percent ?? (attempt.totalQuestions ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0),
      passed: !!attempt.passed,
      passingPercentage: attempt.passingPercentage ?? 70,
      createdAt: attempt.createdAt,
    });
  } catch (err) {
    console.error("Error fetching quiz attempt", err);
    res.status(500).json({ message: "Failed to fetch quiz attempt" });
  }
});

// Global error handler for multer fileFilter errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === "Only PDF files are allowed") {
    return res.status(400).json({ message: err.message });
  }
  console.error("Unexpected error", err);
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Course.updateMany(
      { status: { $exists: false } },
      { $set: { status: "PUBLISHED" } }
    ).exec();

    app.listen(PORT, () => {
      console.log(`Backend API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
