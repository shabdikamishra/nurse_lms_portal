import { Notification } from "../schemas/models.js";

export async function createNotification({
  userId,
  type,
  title,
  message,
  courseId = null,
  metadata = {},
}) {
  return Notification.create({
    userId,
    type,
    title,
    message,
    courseId,
    metadata,
  });
}

export async function notifyAdminsOfCourseSubmission(course, supervisor) {
  const { User } = await import("../schemas/models.js");
  const admins = await User.find({ role: "admin" }).lean().exec();
  const deptLabel = supervisor.department || "department";
  const title = "Course approval requested";
  const message = `${supervisor.name} submitted "${course.title}" (${deptLabel}) for approval.`;

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        type: "COURSE_APPROVAL_REQUEST",
        title,
        message,
        courseId: course._id,
        metadata: {
          supervisorId: supervisor._id,
          supervisorName: supervisor.name,
          departmentId: course.departmentId,
        },
      })
    )
  );
}

export async function notifySupervisorCourseDecision(
  course,
  supervisorId,
  approved,
  rejectionReason = ""
) {
  if (!supervisorId) return;
  const title = approved ? "Course approved" : "Course rejected";
  const message = approved
    ? `Your course "${course.title}" has been approved and is now published.`
    : `Your course "${course.title}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`;

  await createNotification({
    userId: supervisorId,
    type: approved ? "COURSE_APPROVED" : "COURSE_REJECTED",
    title,
    message,
    courseId: course._id,
    metadata: { rejectionReason },
  });
}
