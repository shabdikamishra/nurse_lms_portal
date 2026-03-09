import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";

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

// Multer storage configuration to save PDFs on disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeOriginal = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}_${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

// Mongo models
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
    name: "Sarah Johnson",
    role: "nurse",
    department: "Intensive Care Unit (ICU)",
    supervisor: "Dr. Michael Chen",
    shiftTime: "7:00 AM - 7:00 PM",
  },
  "admin@hospital.com": {
    id: "2",
    email: "admin@hospital.com",
    password: "admin123",
    name: "Emily Rodriguez",
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
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword =
    typeof password === "string" ? password.trim() : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = demoUsers[normalizedEmail];
  if (!user || user.password !== normalizedPassword) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const { password: _pw, ...userWithoutPassword } = user;
  // Fake token for now
  const token = "demo-token";

  res.json({ user: userWithoutPassword, token });
});

// Upload PDF for nurse (admin)
app.post(
  "/api/nurse-files",
  upload.single("file"),
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
