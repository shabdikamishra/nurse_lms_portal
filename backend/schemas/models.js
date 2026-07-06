import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    empId: { type: String, required: true },
    department: { type: String, required: true },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["nurse", "admin", "supervisor"],
      default: "nurse",
    },
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
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvalDate: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
    submittedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
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
    passingPercentage: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    maxQuizAttempts: { type: Number, default: null, min: 1 },
    contentFile: {
      filename: { type: String, default: "" },
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      data: { type: Buffer, default: null },
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
    data: { type: Buffer, required: true },
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
    data: { type: Buffer, required: true },
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
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    registeredAt: { type: Date, default: Date.now },
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
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
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
    },
    lessonsViewed: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
    ],
    sopsViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: "SOP" }],
    contentViewed: { type: Boolean, default: false },
    quizPassed: { type: Boolean, default: false },
    quizScore: { type: Number, default: 0, min: 0, max: 100 },
    quizAttemptsCount: { type: Number, default: 0, min: 0 },
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
    data: { type: Buffer, required: true },
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
    percent: { type: Number, default: 0, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    passingPercentage: { type: Number, default: 70, min: 0, max: 100 },
  },
  { timestamps: true }
);
quizAttemptSchema.index({ userId: 1, moduleId: 1 });

const moduleAssignmentSchema = new mongoose.Schema(
  {
    nurseId: {
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
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
      index: true,
    },
  },
  { timestamps: true }
);
moduleAssignmentSchema.index({ nurseId: 1, moduleId: 1 }, { unique: true });

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "COURSE_APPROVAL_REQUEST",
        "COURSE_APPROVED",
        "COURSE_REJECTED",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED"],
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

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
export const ModuleAssignment = mongoose.model(
  "ModuleAssignment",
  moduleAssignmentSchema
);
export const Notification = mongoose.model("Notification", notificationSchema);
export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
