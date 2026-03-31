import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nurse_lms_files";

// Ensure uploads directory exists using fs module
const uploadsDir = path.join(process.cwd(), "backend", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const nurseFilesDir = path.join(uploadsDir, "nurse-files");
const lessonsDir = path.join(uploadsDir, "lessons");
const sopsDir = path.join(uploadsDir, "sops");
for (const dir of [nurseFilesDir, lessonsDir, sopsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || "100");
const MAX_UPLOAD_BYTES = Number.isFinite(MAX_UPLOAD_MB)
  ? MAX_UPLOAD_MB * 1024 * 1024
  : 100 * 1024 * 1024;

function makeSafeFilename(originalName) {
  const safeOriginal = String(originalName || "file").replace(/\s+/g, "_");
  const rand = crypto.randomBytes(8).toString("hex");
  return `${Date.now()}_${rand}_${safeOriginal}`;
}

function diskStorage(destinationDir) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destinationDir);
    },
    filename: function (req, file, cb) {
      cb(null, makeSafeFilename(file.originalname));
    },
  });
}

const nursePdfUpload = multer({
  storage: diskStorage(nurseFilesDir),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

const lessonUpload = multer({
  storage: diskStorage(lessonsDir),
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
  storage: diskStorage(sopsDir),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

// Mongo models
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    empId: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, enum: ["nurse", "admin"], default: "nurse" },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);
const Department = mongoose.model("Department", departmentSchema);

const courseSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);
const Course = mongoose.model("Course", courseSchema);

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);
moduleSchema.index({ courseId: 1, order: 1 }, { unique: true });
const Module = mongoose.model("Module", moduleSchema);

const lessonSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["pdf", "video"], required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);
const Lesson = mongoose.model("Lesson", lessonSchema);

const sopSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);
const SOP = mongoose.model("SOP", sopSchema);

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed"],
      default: "not-started",
    },
    percent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);
progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });
const Progress = mongoose.model("Progress", progressSchema);

const nurseFileSchema = new mongoose.Schema(
  {
    nurseEmail: { type: String, required: true },
    title: { type: String, required: true },
    filename: { type: String, required: true }, // stored filename on disk
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String }, // admin email
  },
  { timestamps: true }
);

const NurseFile = mongoose.model("NurseFile", nurseFileSchema);

// Very simple in-memory demo users for auth
const demoUsers = {
  "nurse@hospital.com": {
    id: "1",
    email: "nurse@hospital.com",
    password: "nurse123",
    name: "Sarah Nagi",
    role: "nurse",
    department: "Intensive Care Unit (ICU)",
    supervisor: "Dr. Ram Prasad",
    shiftTime: "7:00 AM - 7:00 PM",
  },
  "admin@hospital.com": {
    id: "2",
    email: "admin@hospital.com",
    password: "admin123",
    name: "Harsh Agarwal",
    role: "admin",
    department: "Training Administration",
  },
};

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
  
  // First try to find in MongoDB
  const user = await User.findOne({ email }).lean().exec();
  if (user) return user;
  
  // Fallback to demo users for development
  const demoUser = demoUsers[email];
  if (demoUser) {
    // Convert demo user to match database format
    return {
      _id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      department: demoUser.department,
    };
  }
  
  return null;
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
  const courseId = await getCourseIdForModule(moduleId);
  if (!courseId) return false;
  return isEnrolledInCourse(reqUser._id, courseId);
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

  // First try to authenticate against persistent MongoDB users
  User.findOne({ email: normalizedEmail })
    .lean()
    .then((dbUser) => {
      if (dbUser && dbUser.password === normalizedPassword) {
        const { password: _pw, ...userWithoutPassword } = dbUser;
        const token = "demo-token";
        return res.json({ user: userWithoutPassword, token });
      }

      // Fallback to in-memory demo users
      const demoUser = demoUsers[normalizedEmail];
      if (!demoUser || demoUser.password !== normalizedPassword) {
        return res
          .status(401)
          .json({ message: "Invalid email or password" });
      }

      const { password: _demoPw, ...demoUserWithoutPassword } = demoUser;
      const token = "demo-token";
      return res.json({ user: demoUserWithoutPassword, token });
    })
    .catch((err) => {
      console.error("Error during login", err);
      res.status(500).json({ message: "Failed to login" });
    });
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

// Modules CRUD + reorder within course
app.get("/api/courses/:courseId/modules", requireAuth(), async (req, res) => {
  try {
    const modules = await Module.find({ courseId: req.params.courseId })
      .sort({ order: 1 })
      .lean()
      .exec();
    res.json(modules);
  } catch (err) {
    console.error("Error fetching modules", err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

app.post("/api/courses/:courseId/modules", requireAdmin(), async (req, res) => {
  try {
    const { title } = req.body || {};
    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      return res.status(400).json({ message: "Module title is required" });
    }
    const courseExists = await Course.exists({ _id: req.params.courseId });
    if (!courseExists) {
      return res.status(400).json({ message: "Invalid courseId" });
    }
    const last = await Module.findOne({ courseId: req.params.courseId })
      .sort({ order: -1 })
      .lean()
      .exec();
    const nextOrder = last ? (last.order ?? 0) + 1 : 1;
    const created = await Module.create({
      courseId: req.params.courseId,
      title: trimmedTitle,
      order: nextOrder,
    });
    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating module", err);
    res.status(500).json({ message: "Failed to create module" });
  }
});

app.put("/api/modules/:id", requireAdmin(), async (req, res) => {
  try {
    const { title } = req.body || {};
    const update = {};
    if (typeof title === "string") {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ message: "title cannot be empty" });
      }
      update.title = trimmedTitle;
    }
    const updated = await Module.findByIdAndUpdate(req.params.id, update, {
      new: true,
    })
      .lean()
      .exec();
    if (!updated) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating module", err);
    res.status(500).json({ message: "Failed to update module" });
  }
});

app.delete("/api/modules/:id", requireAdmin(), async (req, res) => {
  try {
    const deleted = await Module.findByIdAndDelete(req.params.id).lean().exec();
    if (!deleted) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.json({ message: "Module deleted" });
  } catch (err) {
    console.error("Error deleting module", err);
    res.status(500).json({ message: "Failed to delete module" });
  }
});

app.post(
  "/api/courses/:courseId/modules/reorder",
  requireAdmin(),
  async (req, res) => {
  try {
    const { orderedModuleIds } = req.body || {};
    if (!Array.isArray(orderedModuleIds) || orderedModuleIds.length === 0) {
      return res
        .status(400)
        .json({ message: "orderedModuleIds array is required" });
    }

    const courseId = req.params.courseId;
    const modules = await Module.find({ courseId }).lean().exec();
    const moduleIdSet = new Set(modules.map((m) => String(m._id)));
    for (const id of orderedModuleIds) {
      if (!moduleIdSet.has(String(id))) {
        return res.status(400).json({
          message: "orderedModuleIds must contain only modules in this course",
        });
      }
    }
    if (orderedModuleIds.length !== modules.length) {
      return res.status(400).json({
        message: "orderedModuleIds must include all modules for this course",
      });
    }

    const bulk = orderedModuleIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, courseId },
        update: { $set: { order: idx + 1 } },
      },
    }));
    await Module.bulkWrite(bulk);
    res.json({ message: "Reordered successfully" });
  } catch (err) {
    console.error("Error reordering modules", err);
    res.status(500).json({ message: "Failed to reorder modules" });
  }
  }
);

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
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
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
    const filePath = path.join(lessonsDir, lesson.filename);
    await Lesson.deleteOne({ _id: lesson._id });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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
    const filePath = path.join(lessonsDir, lesson.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.setHeader("Content-Type", lesson.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${lesson.originalName}"`
    );
    return res.sendFile(filePath);
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
    const filePath = path.join(lessonsDir, lesson.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const contentType = lesson.mimeType || "video/mp4";

    if (!range) {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const parts = String(range).replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
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
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
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
    const filePath = path.join(sopsDir, sop.filename);
    await SOP.deleteOne({ _id: sop._id });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
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
    const filePath = path.join(sopsDir, sop.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.setHeader("Content-Type", sop.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sop.originalName}"`
    );
    return res.sendFile(filePath);
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

// Learner/Admin - list modules available to current user
app.get("/api/me/modules", requireAuth(), async (req, res) => {
  try {
    const current = req.user;
    const isAdmin = current.role === "admin";

    let courseIds = [];
    if (isAdmin) {
      const allCourses = await Course.find({}).select({ _id: 1 }).lean().exec();
      courseIds = allCourses.map((c) => c._id);
    } else {
      const enrollments = await Enrollment.find({ userId: current._id })
        .select({ courseId: 1 })
        .lean()
        .exec();
      courseIds = enrollments.map((e) => e.courseId);
    }

    const courses = await Course.find({ _id: { $in: courseIds } })
      .lean()
      .exec();
    const departments = await Department.find({}).lean().exec();
    const deptById = new Map(departments.map((d) => [String(d._id), d]));
    const courseById = new Map(courses.map((c) => [String(c._id), c]));

    const modules = await Module.find({ courseId: { $in: courseIds } })
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
      const progress = progressByModuleId.get(String(m._id));
      return {
        _id: m._id,
        title: m.title,
        order: m.order,
        course: course
          ? { _id: course._id, title: course.title, departmentId: course.departmentId }
          : null,
        department: dept ? { _id: dept._id, name: dept.name } : null,
        progress: progress
          ? { status: progress.status, percent: progress.percent }
          : { status: "not-started", percent: 0 },
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
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
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
    const filePath = path.join(uploadsDir, fileDoc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }
    res.download(filePath, fileDoc.originalName);
  } catch (err) {
    console.error("Error downloading nurse file", err);
    res.status(500).json({ message: "Failed to download file" });
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
