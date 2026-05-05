import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { buildModuleRoutes } from "./routes/moduleRoutes.js";
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
} from "./schemas/models.js";

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

async function isEnrolledInCourse(userId, courseId) {
  if (!userId || !courseId) return false;
  const exists = await Enrollment.exists({ userId, courseId });
  return !!exists;
}

async function getCourseIdForModule(moduleId) {
  const mod = await Module.findById(moduleId).lean().exec();
  return mod?.courseId ? String(mod.courseId) : null;
}

async function canAccessModuleContent(reqUser, moduleId) {
  if (!reqUser) return false;
  if (reqUser.role === "admin") return true;
  const assigned = await ModuleAssignment.exists({
    nurseId: reqUser._id,
    moduleId,
  });
  if (assigned) return true;
  const courseId = await getCourseIdForModule(moduleId);
  if (!courseId) return false;
  return isEnrolledInCourse(reqUser._id, courseId);
}

function mapAssignmentStatusToProgress(status) {
  if (status === "COMPLETED") return { status: "completed", percent: 100 };
  if (status === "IN_PROGRESS") return { status: "in-progress", percent: 50 };
  return { status: "not-started", percent: 0 };
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

      const { password: _pw, ...userWithoutPassword } = dbUser;
      const token = "session-token";
      return res.json({ user: userWithoutPassword, token });
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
    const { email, name, empId, department, role } = req.body || {};

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
      !normalizedEmail ||
      !name ||
      !empId ||
      !department
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

    // Use a simple configurable demo password; can be changed later by the user
    const defaultPassword =
      process.env.DEFAULT_USER_PASSWORD || "demo1234";

    const user = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      empId: empId.trim(),
      department: department.trim(),
      role: role === "admin" ? "admin" : "nurse",
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

app.get("/api/admin/course-library-stats", requireAdmin(), async (req, res) => {
  try {
    const [departmentsCount, coursesCount, modulesCount, questionsCount, activeNurses] =
      await Promise.all([
        Department.countDocuments({}),
        Course.countDocuments({}),
        Module.countDocuments({}),
        Question.countDocuments({}),
        User.countDocuments({ role: "nurse" }),
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
            if (progress && (progress.status === "completed" || Number(progress.percent || 0) > 0)) {
              coveredModules += 1;
            }
            if (progress && progress.status === "completed") {
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
        if (progress && (progress.status === "completed" || Number(progress.percent || 0) > 0)) {
          coveredModules += 1;
        }
        if (progress && progress.status === "completed") {
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

    const [nursesCount, coursesCount, modulesCount, questionsCount, latestAttempts] =
      await Promise.all([
        User.countDocuments({ role: "nurse" }),
        Course.countDocuments({}),
        Module.countDocuments({}),
        Question.countDocuments({}),
        QuizAttempt.find({})
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .exec(),
      ]);

    const completionDocs = await Progress.find({ status: "completed" })
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
    const [assignments, attempts] = await Promise.all([
      ModuleAssignment.find({ nurseId: current._id })
        .select({ moduleId: 1, status: 1 })
        .lean()
        .exec(),
      QuizAttempt.find({ userId: current._id }).lean().exec(),
    ]);

    const totalModules = assignments.length;
    const completedModules = assignments.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    const inProgressModules = assignments.filter(
      (a) => a.status === "IN_PROGRESS"
    ).length;

    const avgQuizScore = attempts.length
      ? Math.round(
          attempts.reduce((sum, a) => {
            const total = Number(a.totalQuestions || 0);
            const pct = total ? Math.round((Number(a.score || 0) / total) * 100) : 0;
            return sum + pct;
          }, 0) / attempts.length
        )
      : 0;

    return res.json({
      totalModules,
      completedModules,
      inProgressModules,
      notStartedModules: Math.max(totalModules - completedModules - inProgressModules, 0),
      avgQuizScore,
      attemptsCount: attempts.length,
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
        status: scorePct >= 70 ? "passed" : "failed",
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
    res.json(course);
  } catch (err) {
    console.error("Error fetching course", err);
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

app.post("/api/courses", requireAdmin(), async (req, res) => {
  try {
    const { departmentId, title, description } = req.body || {};
    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!departmentId || !trimmedTitle) {
      return res
        .status(400)
        .json({ message: "departmentId and title are required" });
    }
    const deptExists = await Department.exists({ _id: departmentId });
    if (!deptExists) {
      return res.status(400).json({ message: "Invalid departmentId" });
    }
    const created = await Course.create({
      departmentId,
      title: trimmedTitle,
      description: typeof description === "string" ? description.trim() : "",
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating course", err);
    res.status(500).json({ message: "Failed to create course" });
  }
});

app.put("/api/courses/:id", requireAdmin(), async (req, res) => {
  try {
    const { departmentId, title, description } = req.body || {};
    const update = {};
    if (departmentId) {
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

app.delete("/api/courses/:id", requireAdmin(), async (req, res) => {
  try {
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

app.use(
  "/api",
  buildModuleRoutes({
    requireAuth,
    requireAdmin,
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
  requireAdmin(),
  lessonUpload.single("file"),
  async (req, res) => {
    try {
      const { title } = req.body || {};
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title is required" });
      }
      const moduleExists = await Module.exists({ _id: req.params.moduleId });
      if (!moduleExists) {
        return res.status(400).json({ message: "Invalid moduleId" });
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

app.delete("/api/lessons/:id", requireAdmin(), async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean().exec();
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
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
  requireAdmin(),
  sopPdfUpload.single("file"),
  async (req, res) => {
    try {
      const { title } = req.body || {};
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const trimmedTitle = typeof title === "string" ? title.trim() : "";
      if (!trimmedTitle) {
        return res.status(400).json({ message: "Title is required" });
      }
      const moduleExists = await Module.exists({ _id: req.params.moduleId });
      if (!moduleExists) {
        return res.status(400).json({ message: "Invalid moduleId" });
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

app.delete("/api/sops/:id", requireAdmin(), async (req, res) => {
  try {
    const sop = await SOP.findById(req.params.id).lean().exec();
    if (!sop) return res.status(404).json({ message: "SOP not found" });
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
app.post("/api/admin/enrollments", requireAdmin(), async (req, res) => {
  try {
    const { userEmail, courseId } = req.body || {};
    const normalizedEmail =
      typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    if (!normalizedEmail || !courseId) {
      return res
        .status(400)
        .json({ message: "userEmail and courseId are required" });
    }
    const user = await User.findOne({ email: normalizedEmail }).exec();
    if (!user) {
      return res.status(400).json({ message: "Invalid userEmail" });
    }
    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) {
      return res.status(400).json({ message: "Invalid courseId" });
    }
    const created = await Enrollment.create({ userId: user._id, courseId });
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Already enrolled" });
    }
    console.error("Error creating enrollment", err);
    res.status(500).json({ message: "Failed to create enrollment" });
  }
});

// Admin - assign modules (or full course) to nurses
app.post("/api/assignments", requireAdmin(), async (req, res) => {
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

    const nurses = await User.find({
      _id: { $in: nurseIds },
      role: "nurse",
    })
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
app.get("/api/assignments", requireAdmin(), async (req, res) => {
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
app.delete("/api/assignments/:id", requireAdmin(), async (req, res) => {
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
    const { status, percent } = req.body || {};
    const allowed = await canAccessModuleContent(req.user, req.params.moduleId);
    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const next = {};
    if (typeof status === "string") {
      if (!["not-started", "in-progress", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      next.status = status;
    }
    if (typeof percent === "number") {
      const p = Math.max(0, Math.min(100, percent));
      next.percent = p;
    }

    const doc = await Progress.findOneAndUpdate(
      { userId: req.user._id, moduleId: req.params.moduleId },
      { $set: next, $setOnInsert: { userId: req.user._id, moduleId: req.params.moduleId } },
      { new: true, upsert: true }
    )
      .lean()
      .exec();

    if (next.status) {
      const mapped =
        next.status === "completed"
          ? "COMPLETED"
          : next.status === "in-progress"
          ? "IN_PROGRESS"
          : "NOT_STARTED";
      await ModuleAssignment.findOneAndUpdate(
        { nurseId: req.user._id, moduleId: req.params.moduleId },
        { $set: { status: mapped } }
      ).exec();
    }

    res.json({ status: doc.status, percent: doc.percent });
  } catch (err) {
    console.error("Error updating progress", err);
    res.status(500).json({ message: "Failed to update progress" });
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
app.post("/api/modules/:moduleId/questions", requireAdmin(), async (req, res) => {
  try {
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

    const moduleExists = await Module.exists({ _id: req.params.moduleId });
    if (!moduleExists) {
      return res.status(400).json({ message: "Invalid moduleId" });
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
app.put("/api/questions/:id", requireAdmin(), async (req, res) => {
  try {
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
app.delete("/api/questions/:id", requireAdmin(), async (req, res) => {
  try {
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

    // Validate and score answers
    const questions = await Question.find({ moduleId: req.params.moduleId }).lean().exec();
    const questionMap = new Map(questions.map(q => [String(q._id), q]));

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

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      moduleId: req.params.moduleId,
      answers: scoredAnswers,
      score: correctCount,
      totalQuestions: questions.length,
    });

    await ModuleAssignment.findOneAndUpdate(
      { nurseId: req.user._id, moduleId: req.params.moduleId },
      { $set: { status: "COMPLETED" } }
    ).exec();

    res.status(201).json({
      _id: attempt._id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percent: Math.round((correctCount / questions.length) * 100),
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
      percent: attempt.totalQuestions ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0,
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

    app.listen(PORT, () => {
      console.log(`Backend API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
