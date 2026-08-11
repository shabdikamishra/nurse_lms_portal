# Nurse Care Learn LMS - Reference Database and Master Summary

This document serves as the master source of truth for the Nurse Care Learn Learning Management System (LMS). It contains detailed specifications of the system architecture, database models, authorization/access control mechanics, content delivery flows, and a complete API catalog. It is designed to be ingested by a retrieval-augmented generation (RAG) system to power a specialized AI Q&A chatbot.

---

## 1. Project Overview & Tech Stack

Nurse Care Learn is a web-based Learning Management System designed to manage compliance training and standard operating procedures (SOPs) for nurses inside a hospital environment.

- **Frontend**: React (Vite, TypeScript, Tailwind CSS, shadcn/ui).
- **Backend**: Node.js, Express.js (REST API, Multer for file buffers, Morgan logging).
- **Database**: MongoDB with Mongoose ODM.
- **Port Configurations**:
  - Frontend: `http://localhost:5173`
  - Backend: `http://localhost:4000`
- **File Storage**: Uploaded files (lessons PDF/Video, SOP PDFs) are stored directly inside the MongoDB database as Binary buffers (`Buffer` type in Mongoose) under Mongoose schemas to avoid absolute local filesystem paths in production and support transactional data consistency.

---

## 2. User Personas & Permissions Matrix

The system features three distinct user personas, each with dedicated dashboards and access permissions.

| Feature / Permission | Admin | Supervisor | Nurse (Learner) |
|---|---|---|---|
| **Primary Dashboard Focus** | Hospital-wide compliance metrics, certifications due (30 days), non-compliant counts | Departmental nurse count, department course status pipeline, course assignments | Personal course list, progress percentages, lessons viewed, quiz averages |
| **User CRUD Operations** | Full CRUD (Create, Edit, Delete, Read) all users | Read department nurses only | None |
| **Training Reminders** | Can send `USER_REMINDER` notifications to any nurse | None | None |
| **Department Management** | Full CRUD for all departments | Read-only | None |
| **Create Courses** | Can create courses in any department | Can create courses ONLY in their own department | None |
| **Publish Courses** | Can publish directly | No (Requires Admin approval) | None |
| **Approve / Reject Courses** | Yes, reviews supervisor course requests | No | None |
| **Edit/Create Course Modules**| Yes, anytime | Yes, but only for draft/rejected department courses | None |
| **Upload Lessons & SOP Content**| Yes, anytime | Yes, but only for draft/rejected department courses | None (Can only view/download) |
| **Manage Question Bank** | Full CRUD (MCQ & True/False) | Full CRUD, but only for draft/rejected department courses | None |
| **Self Password Change** | Yes | Yes | Yes |
| **Course Enrollment** | Register any nurse to any course | Register department nurses to published courses | None (Auto-registers via Enrollment) |
| **View Audit Logs** | Yes | No | No |

---

## 3. Database Schemas (Data Models)

The following configurations detail the MongoDB schemas implemented in `nurse-care-learn/backend/schemas/models.js`.

### 3.1. User Schema (`User`)
Stores identities and roles of all users.
- `email`: String (lowercase, unique, index) - Email identifier.
- `name`: String - Full name.
- `empId`: String - Employee ID.
- `department`: String - Name of department.
- `departmentId`: ObjectId (ref: `Department`, index) - Assigned department ID.
- `role`: Case-sensitive String (enum: `['nurse', 'admin', 'supervisor']`, default: `nurse`).
- `status`: String (enum: `['active', 'deactivated', 'archived']`, default: `active`, index).
- `password`: String - Plaintext password (configurable default `demo1234`).

### 3.2. Department Schema (`Department`)
Maintains institutional hospital department groups.
- `name`: String (unique, trim) - Unique name of the department (e.g. ICU, Emergency, Pediatrics).

### 3.3. Course Schema (`Course`)
Defines the container of modules and curriculum.
- `departmentId`: ObjectId (ref: `Department`, required, index).
- `title`: String (required, trim).
- `description`: String (default: `""`, trim).
- `status`: String (enum: `['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED']`, default: `DRAFT`, index).
- `createdBy`: ObjectId (ref: `User`).
- `approvedBy`: ObjectId (ref: `User`, default: `null`).
- `approvalDate`: Date (default: `null`).
- `rejectionReason`: String (default: `""`, trim) - Provided by Admin if rejected.
- `submittedAt`: Date (default: `null`) - When supervisor submitted for approval.
- `publishedAt`: Date (default: `null`).

### 3.4. Module Schema (`Module`)
A sub-unit of learning within a Course.
- `courseId`: ObjectId (ref: `Course`, required, index).
- `title`: String (required, trim).
- `order`: Number (required) - Controls sorting order. (No arrow key reordering in frontend UI; order values are handled programmatically).
- `targetRole`: String.
- `estimatedDuration`: String.
- `learningObjectives`: String.
- `mode`: String.
- `language`: String.
- `certification`: String.
- `passingPercentage`: Number (default: `70`, min `0`, max `100`).
- `maxQuizAttempts`: Number (default: `null`, min `1`) - Null represents unlimited attempts.
- `contentFile`: Sub-document containing raw fallback uploads:
  - `filename`: String, `originalName`: String, `mimeType`: String, `size`: Number, `data`: Buffer.

### 3.5. Lesson Schema (`Lesson`)
Course content unit under a specific Module (Lessons can be multiple per module).
- `moduleId`: ObjectId (ref: `Module`, required, index).
- `title`: String (required, trim).
- `type`: String (enum: `['pdf', 'video']`).
- `filename`: String, `originalName`: String, `mimeType`: String, `size`: Number.
- `data`: Buffer (binary content stored directly in MongoDB).
- `uploadedBy`: String - Email of uploader.

### 3.6. SOP Schema (`SOP`)
Standard Operating Procedure documents (must be PDF only) uploaded at the module level.
- `moduleId`: ObjectId (ref: `Module`, required, index).
- `title`: String (required, trim).
- `filename`: String, `originalName`: String, `mimeType`: String, `size`: Number.
- `data`: Buffer (binary content stored directly in MongoDB).
- `uploadedBy`: String - Email of uploader.

### 3.7. Enrollment Schema (`Enrollment`)
Represents registry of a Nurse to a Course.
- `userId`: ObjectId (ref: `User`, required, index) - Enrolled nurse.
- `courseId`: ObjectId (ref: `Course`, required, index) - Registered course.
- `registeredBy`: ObjectId (ref: `User`) - Admin/Supervisor who performed registry.
- `registeredAt`: Date (default: `Date.now`).
- *Index Constraints*: Compound unique index `{ userId: 1, courseId: 1 }` prevents double enrollment.

### 3.8. Progress Schema (`Progress`)
Tracks nurse completion metrics per module.
- `userId`: ObjectId (ref: `User`, required, index).
- `courseId`: ObjectId (ref: `Course`, index).
- `moduleId`: ObjectId (ref: `Module`, required, index).
- `status`: String (enum: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`, default: `NOT_STARTED`).
- `lessonsViewed`: Array of ObjectId (ref: `Lesson`) - Tracks which lessons are completed.
- `sopsViewed`: Array of ObjectId (ref: `SOP`) - Tracks which SOPs are read.
- `contentViewed`: Boolean (default: `false`) - True if all lessons & SOPs under the module are viewed.
- `quizPassed`: Boolean (default: `false`) - True if they passed the quiz assessment.
- `quizScore`: Number (default: `0`, max `100`).
- `quizAttemptsCount`: Number (default: `0`).
- `percent`: Number (default: `0`, max `100`).
- *Index Constraints*: Compound unique index `{ userId: 1, moduleId: 1 }`.

### 3.9. Question Schema (`Question`)
Assigned questions for assessments.
- `moduleId`: ObjectId (ref: `Module`, required, index).
- `question`: String (required, trim).
- `type`: String (enum: `['mcq', 'true-false']`).
- `options`: Array of Strings (empty for True/False, holds up to 4 elements for MCQ).
- `correctAnswer`: String (options value or `"true"`/`"false"`).
- `order`: Number (default: `0`, index compound `{ moduleId: 1, order: 1 }`).

### 3.10. QuizAttempt Schema (`QuizAttempt`)
Logs of individual learner quiz submissions.
- `userId`: ObjectId (ref: `User`, required, index).
- `moduleId`: ObjectId (ref: `Module`, required, index, compound index).
- `answers`: Array of objects:
  - `questionId`: ObjectId, `selectedAnswer`: String, `isCorrect`: Boolean.
- `score`: Number (count of correct answers).
- `totalQuestions`: Number (total questions on exam date).
- `percent`: Number (score/total as percentage).
- `passed`: Boolean.
- `passingPercentage`: Number.

### 3.11. ModuleAssignment Schema (`ModuleAssignment`)
Dedicated tracking for supervisor-assigned targeted modules with due dates.
- `nurseId`: ObjectId (ref: `User`, required, index).
- `courseId`: ObjectId (ref: `Course`, required, index).
- `moduleId`: ObjectId (ref: `Module`, required, index).
- `assignedBy`: ObjectId (ref: `User`, required).
- `assignedAt`: Date (default: `Date.now`).
- `dueDate`: Date (default: `null`).
- `status`: String (enum: `['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']`, default: `NOT_STARTED`, index).
- *Index Constraints*: Compound unique index `{ nurseId: 1, moduleId: 1 }`.

### 3.12. Notification Schema (`Notification`)
Maintains alerts for system workflow notifications.
- `userId`: ObjectId (ref: `User`, required, index).
- `type`: String (enum: `['COURSE_APPROVAL_REQUEST', 'COURSE_APPROVED', 'COURSE_REJECTED', 'USER_REMINDER']`).
- `title`: String, `message`: String.
- `courseId`: ObjectId (ref: `Course`, default: `null`).
- `read`: Boolean (default: `false`, index).
- `metadata`: Mixed JSON object.

### 3.13. AuditLog Schema (`AuditLog`)
Compliance audit trail.
- `action`: String (enum: `['COURSE_SUBMITTED', 'COURSE_APPROVED', 'COURSE_REJECTED']`).
- `courseId`: ObjectId (ref: `Course`, required, index).
- `performedBy`: ObjectId (ref: `User`).
- `targetUserId`: ObjectId (ref: `User`, default: `null`).
- `details`: Mixed JSON object.

---

## 4. Key Workflows & Content Flow

### 4.1. Course Approval Workflow
This layout governs course publishing restrictions:
```
[Supervisor (DRAFT status)] 
       │ 
       ▼
[Submit for Approval PATCH] ────────► Send COURSE_APPROVAL_REQUEST Notification to Admin
       │                              Status sets to "PENDING_APPROVAL"
       ▼
[Admin reviews pending queue]
       │
       ├─► [Approve PATCH] ─────────► Status Sets to "PUBLISHED" 
       │                              Sends COURSE_APPROVED Notification to Supervisor
       │
       └─► [Reject PATCH] ──────────► Status returns to "REJECTED" (Stores rejectionReason)
                                      Sends COURSE_REJECTED Notification to Supervisor
```

- **Drafting**: When a Supervisor creates a course, it is designated as `DRAFT` status and can only belong to their department. Modules, questions, lessons, and SOPs can be added inside this phase.
- **Editing Restrictions**: A Supervisor can only edit courses that are in `DRAFT` or `REJECTED` status. Once a course changes status to `PENDING_APPROVAL` or `PUBLISHED`, the Supervisor's editing permissions are revoked to guarantee QA stability. Admins are exempt from status restrictions and can modify or publish courses at any time.

---

### 4.2. Content Delivery & Lessons Flow
The flow of learning material to the Nurse persona is modeled as follows:

1. **Course Enrollment**: A nurse cannot see content unless they are registered/enrolled. Registries occur either via Admin registration, supervisor assignment, or default enrollment.
2. **Access Security (`canAccessModuleContent`)**:
   - Admins and Supervisors can access all content for development purposes.
   - Learners can access content only if: (a) the parent course is `PUBLISHED`, (b) the learner is enrolled in the course, and (c) the prerequisite module progress checks pass (modules must be unlocked sequentially in their designated `order`).
3. **Module Detail Component (`frontend/src/pages/nurse/ModuleDetail.tsx`)**:
   - Renders inline items.
   - Lessons are categorized as `pdf` (viewed inside a reader) or `video` (played inside a custom HTML5 video element).
   - SOPs are shown separately as standard PDFs.
4. **Progress Tracking**:
   - Each time a Nurse opens a lesson, a POST request is recorded to `/api/progress/verify`.
   - Marking a lesson/SOP viewed saves the ID inside the Nurse's Mongoose `Progress` document under `lessonsViewed` or `sopsViewed`.
   - Once the count of viewed items matches the exact list of lessons + SOPs configured for that module, `contentViewed` is marked `true`. The interface then unlocks the "Take Quiz Assessment" CTA.

---

### 4.3. Question Bank & Quiz Evaluation Flow
Once learning content is fully completed, the learner undergoes a knowledge check:

```
                  [Content Completed: contentViewed = true]
                                     │
                                     ▼
                [Learner requests Quiz questions from API] 
                     ( correctAnswer fields are removed )
                                     │
                                     ▼
                      [Learner responds to questions]
                     ( One-by-one radio configuration )
                                     │
                                     ▼
                 [Answers submitted to /quiz-attempt POST]
                                     │
                                     ▼
            [Backend Scoring & Attempt validation checks]
              - Attempt count incremented in database
              - Compare selections against correct answers
              - Calculate scoring percent
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
         [Percent >= Threshold]                  [Percent < Threshold]
           Passed = true                           Passed = false
         Unlock next module                      Allows retaking (unless max limit)
```

- **Prerequisites & Max Attempts Limit Check**: Before returning quiz questions or submitting attempts, the backend validates that the user hasn't exceeded the module's `maxQuizAttempts` limit (saved in the `Module` schema limit config).
- **Evaluating Passed Status**: The backend calculates correct scores. If the scoring percentage is $\ge$ the module's passing threshold (`passingPercentage` in Module, defaulting to `70%`), Mongoose marks `quizPassed = true` inside the `Progress` document.
- **Double Completion Actions**: Passing the quiz updates `QuizAttempt` and flags `Progress.status` to `"COMPLETED"`, which recursively triggers checks. Additionally, the corresponding `ModuleAssignment.status` updates to `"COMPLETED"`, enabling progression to the next module.
- **Review Screen Details**: The results payload returns `answers` containing correct indicators. Incorrect answers flag correct mappings so they can be displayed in red/green highlight configurations on the nurse's review card.

---

### 4.4. Authentication, Credentials, & Change Password Flow
- **Bootstrap Phase**: The API contains a bootstrap handler `/api/auth/bootstrap-admin` that creates the original Admin account if 0 accounts exist in MongoDB.
- **Credential Instantiation**: Users are created by Admins via `/api/admin/users`. They are given a default password (`demo1234`).
- **Standard Login (`/api/auth/login`)**: Validates email and plaintext matching. On success, it issues a fake token wrapper (`session-token`) and returning user payload details.
- **x-user-email Authenticating Header**: The application utilizes the `x-user-email` HTTP custom request header inside headers payload to verify identity on CRUD backend endpoints.
- **Self-Service Password Change**:
  - Available to all roles under `/api/auth/change-password`.
  - Expects `email`, `oldPassword`, and `newPassword`.
  - Validates that the `oldPassword` matches the current DB password for that email before running `user.password = newPassword` and saving.

---

## 5. API Endpoint Specifications

| Endpoint Path | HTTP | Required Auth | Purpose | Input / Body Parameters | Response Structure (200/201) |
|---|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Authenticates credentials | `email`, `password` | `{ user: Object, token: String }` |
| `/api/auth/bootstrap-admin` | `POST` | Public (0 accounts in DB) | Initial site deployment | `email`, `password`, `name`, `empId`, `department` | `{ message: String, user: Object }` |
| `/api/auth/change-password` | `POST` | Valid Email | Self change password | `email`, `oldPassword`, `newPassword` | `{ message: "Password updated successfully" }` |
| `/api/admin/users` | `POST` | Admin | Create new user account | `email`, `name`, `empId`, `department`, `departmentId`, `role` | `{ message: String, user: Object, demoPassword: String }` |
| `/api/admin/users` | `GET` | Admin | Get list of all users | None | Array of User objects (minus password) |
| `/api/admin/users/:id` | `PATCH`| Admin | Update user details | `name`, `empId`, `department`, `departmentId`, `role`, `status` | `{ message: String, user: Object }` |
| `/api/admin/users/:id` | `DELETE`| Admin | Delete user registry | None | `{ message: "User deleted successfully" }` |
| `/api/admin/users/:id/reminder` | `POST` | Admin | Notify user to complete training | None | `{ message: "Reminder sent to..." }` |
| `/api/courses` | `GET` | Authenticated | List courses (nurses get PUBLISHED, supervisors get department only) | optional `departmentId` query | Array of Course objects |
| `/api/courses/:id` | `GET` | Authenticated | Get course detail | None | Course JSON Object |
| `/api/courses` | `POST` | Admin/Supervisor | Create course container | `departmentId` (admin), `title`, `description` | Course JSON object (Status: DRAFT) |
| `/api/courses/:id` | `PUT` | Admin/Supervisor | Edit course properties | `departmentId` (admin), `title`, `description` | Course JSON object |
| `/api/courses/:id` | `DELETE`| Admin/Supervisor | Delete course container | None | `{ message: "Course deleted" }` |
| `/api/courses/:id/publish` | `PATCH`| Admin | Publish admin course | None | Course JSON object (Status: PUBLISHED) |
| `/api/courses/:id/draft` | `PATCH`| Admin | Revert course to draft | None | Course JSON object (Status: DRAFT) |
| `/api/courses/:id/submit-approval`| `PATCH`| Supervisor | Request admin publish | None | Course JSON object (Status: PENDING_APPROVAL) |
| `/api/admin/pending-courses` | `GET` | Admin | List supervisor pending items | None | Array of pending Course objects with supervisor details |
| `/api/admin/courses/:id/approve` | `PATCH`| Admin | Approve supervisor course | None | `{ message: String, course: Object }` |
| `/api/admin/courses/:id/reject` | `PATCH`| Admin | Reject supervisor course | `rejectionReason` | `{ message: String, course: Object }` |
| `/api/admin/course-library-stats` | `GET` | Admin/Supervisor | Stats for library dashboards | None | `{ departments: N, totalModules: N, questionBank: N, activeNurses: N, courses: N }` |
| `/api/admin/enrollments` | `POST` | Admin/Supervisor | Enroll user to course | `userId` or `userEmail`, `courseId` | Enrollment JSON object |
| `/api/admin/enrollments` | `GET` | Admin/Supervisor | Fetch course enrollments | optional `courseId` / `userId` query | Array of populated Enrollment objects |
| `/api/assignments` | `POST` | Admin/Supervisor | Bulk assign modules to nurse | `nurseId` / `userId`, `moduleId`, `dueDate` | Assignment JSON details |
| `/api/assignments` | `GET` | Admin/Supervisor | List all module assignments | None | Array of populated Assignments |
| `/api/assignments/:id` | `PATCH`| Authenticated | Update assignment status/due dates | `status` (nurse/admin), `dueDate` (admin/supervisor) | Assignment JSON details |
| `/api/assignments/:id` | `DELETE`| Admin/Supervisor | Remove module assignment | None | `{ message: "Assignment removed" }` |
| `/api/modules/:moduleId/lessons` | `GET` | Authenticated | Retrieve lessons for module | None | Array of Lesson details (containing secure streaming / download fileUrls) |
| `/api/modules/:moduleId/lessons` | `POST` | Admin/Supervisor | Upload module lesson | Form-data: `title`, `file` buffer | Lesson JSON object |
| `/api/lessons/:id/download` | `GET` | Authenticated | Download PDF lesson file | None | Binary PDF Stream |
| `/api/lessons/:id/stream` | `GET` | Authenticated | Video stream handler | Header: Range | video buffer stream chunk |
| `/api/modules/:moduleId/sops` | `GET` | Authenticated | Retrieve SOPs for module | None | Array of SOP JSON configurations |
| `/api/modules/:moduleId/sops` | `POST` | Admin/Supervisor | Upload SOP PDF file | Form-data: `title`, `file` buffer | SOP JSON object |
| `/api/sops/:id/download` | `GET` | Authenticated | Download SOP PDF file | None | Binary PDF Stream |
| `/api/modules/:moduleId/questions`| `GET` | Admin/Supervisor | Get questions with correct answers | None | Array of Question configurations (full details) |
| `/api/modules/:moduleId/questions/learner`| `GET`| Authenticated | Get questions (removes correctAnswer) | None | Array of Question details (removes correctAnswer field) |
| `/api/modules/:moduleId/questions`| `POST` | Admin/Supervisor | Create quiz question config | `question`, `type`, `options`, `correctAnswer` | Created Question object |
| `/api/questions/:id` | `PUT` | Admin/Supervisor | Update quiz question config | `question`, `type`, `options`, `correctAnswer` | Updated Question object |
| `/api/questions/:id` | `DELETE`| Admin/Supervisor | Remove quiz question config | None | `{ message: "Question deleted" }` |
| `/api/modules/:moduleId/quiz-attempt`| `POST`| Authenticated | Submit quiz responses | Array `answers` of `{ questionId, selectedAnswer }` | Scored attempt payload, pass/fail result, and correctness analysis |
| `/api/modules/:moduleId/quiz-attempt`| `GET` | Authenticated | Get latest quiz attempt stats | None | `{ _id: id, score: N, totalQuestions: N, percent: N, passed: Boolean, passingPercentage: N }` |
| `/api/notifications` | `GET` | Authenticated | Get user notifications | None | Array of notification items |
| `/api/notifications/:id/read` | `PATCH`| Authenticated | Mark notification read | None | Notification JSON object |
| `/api/notifications/read-all` | `PATCH`| Authenticated | Mark all notifications read | None | `{ message: "All notifications marked as read" }` |
| `/api/progress` | `GET` | Authenticated | Get module progress of nurse | `moduleId`, optional `userId` | Progress JSON details |
| `/api/progress/verify` | `POST` | Authenticated | Verify/Mark lesson or SOP as read | `moduleId`, `lessonId` or `sopId` | Updated Progress statistics |

---

## 6. Frontend Routing Map

The routing interface mapped in `nurse-care-learn/frontend/src/App.tsx` routes requests as follows:

### 6.1. Nurse (Learner) Views:
- `/` or `/dashboard` (when logged in as nurse) -> `NurseDashboard.tsx`
- `/modules` -> `MyCourses.tsx` (Complete course catalogue of enrolled items)
- `/courses/:courseId` -> `CourseModules.tsx` (Outline of modules, sequencing, passing indicators)
- `/courses/:courseId/modules/:moduleId` -> `ModuleDetail.tsx` (PDF reader panel, video streaming player frame, SOP catalogue, launch quiz button)
- `/quiz` (Parameters: `?moduleId=XXXXX`) -> `QuizModule.tsx` (Quiz workspace page and evaluation review cards)
- `/certifications` -> `Certifications.tsx` (Accomplished certifications dashboard)
- `/reports` -> `Reports.tsx` (Learner compliance report tracker)
- `/live-classes` -> `LiveClasses.tsx` (Online scheduled lectures)

### 6.2. Admin Views:
- `/dashboard` (when logged in as admin) -> `AdminDashboard.tsx`
- `/users` -> `UserManagement.tsx` (CRUD dashboards for supervisors/nurses)
- `/course-library` -> `CourseLibrary.tsx` (Course outline list and analytics summarization layout)
- `/modules-page` (Parameters: `?courseId=XXXXX`) -> `ModulesPage.tsx` (Three-column module organizer, lessons inline forms, SOP forms, Question Bank builder tabs)
- `/admin/pending-approvals` -> `PendingCourseApprovals.tsx` (Pipeline reviewer page)
- `/admin/assign-modules` -> `AssignModulesPage.tsx` (Course enrollment panel layout configuration)
- `/admin/register-nurse` -> `RegisterNursePage.tsx` (Nurses registry page)
- `/admin/reports` -> `Reports.tsx` (Overall system compliance analytics)
- `/scheduler` -> `LearningScheduler.tsx` (Event scheduler container)

### 6.3. Supervisor Views:
- `/dashboard` (when logged in as supervisor) -> `SupervisorDashboard.tsx`
- `/supervisor/course-library` -> `CourseLibrary.tsx` (Reused component, locked down to their department. Allows course creating/submitting details)
- `/supervisor/assign-modules` -> `AssignModulesPage.tsx` (Reused component, assigns modules to department nurses)
- `/supervisor/register-nurse` -> `RegisterNursePage.tsx` (Reused component, registers department nurses to published courses)

### 6.4. Shared Views:
- `/support` -> `Support.tsx` (Technical support channel details)
- `/change-password` -> `ChangePassword.tsx` (Own password changer panel)
