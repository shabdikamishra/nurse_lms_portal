import mongoose from "mongoose";

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

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

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
    targetRole: { type: String, default: "", trim: true },
    estimatedDuration: { type: String, default: "", trim: true },
    learningObjectives: { type: String, default: "", trim: true },
    mode: { type: String, default: "", trim: true },
    language: { type: String, default: "", trim: true },
    certification: { type: String, default: "", trim: true },
    contentFile: {
      filename: { type: String, default: "" },
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
moduleSchema.index({ courseId: 1, order: 1 }, { unique: true });

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

const nurseFileSchema = new mongoose.Schema(
  {
    nurseEmail: { type: String, required: true },
    title: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

const questionSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    question: { type: String, required: true, trim: true },
    type: { type: String, enum: ["mcq", "true-false"], required: true },
    options: [{ type: String, trim: true }],
    correctAnswer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
questionSchema.index({ moduleId: 1, order: 1 });

const quizAttemptSchema = new mongoose.Schema(
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
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        selectedAnswer: String,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
  },
  { timestamps: true }
);
quizAttemptSchema.index({ userId: 1, moduleId: 1 });

export const User = mongoose.model("User", userSchema);
export const Department = mongoose.model("Department", departmentSchema);
export const Course = mongoose.model("Course", courseSchema);
export const Module = mongoose.model("Module", moduleSchema);
export const Lesson = mongoose.model("Lesson", lessonSchema);
export const SOP = mongoose.model("SOP", sopSchema);
export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export const Progress = mongoose.model("Progress", progressSchema);
export const NurseFile = mongoose.model("NurseFile", nurseFileSchema);
export const Question = mongoose.model("Question", questionSchema);
export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
