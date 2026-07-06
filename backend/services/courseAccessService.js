import { Course, Department, User } from "../schemas/models.js";

export function userDepartmentId(user) {
  if (!user?.departmentId) return null;
  return String(user.departmentId);
}

export async function resolveUserDepartmentId(user) {
  if (user?.departmentId) return String(user.departmentId);
  if (!user?.department) return null;
  const dept = await Department.findOne({ name: user.department.trim() })
    .lean()
    .exec();
  return dept ? String(dept._id) : null;
}

export async function canManageDepartment(user, departmentId) {
  if (!user || !departmentId) return false;
  if (user.role === "admin") return true;
  if (user.role !== "supervisor") return false;
  const userDeptId = await resolveUserDepartmentId(user);
  return userDeptId === String(departmentId);
}

export async function canManageCourse(user, courseId) {
  const course = await Course.findById(courseId).lean().exec();
  if (!course) return { ok: false, course: null };
  if (user?.role === "admin") return { ok: true, course };
  if (user?.role === "supervisor") {
    const userDeptId = await resolveUserDepartmentId(user);
    const ok = userDeptId === String(course.departmentId);
    return { ok, course };
  }
  return { ok: false, course };
}

export function supervisorCanEditCourse(course) {
  if (!course) return false;
  return ["DRAFT", "REJECTED"].includes(course.status);
}

export function supervisorCanSubmitCourse(course) {
  if (!course) return false;
  return ["DRAFT", "REJECTED"].includes(course.status);
}

export async function filterUsersByDepartment(user, query = {}) {
  if (user.role === "admin") return query;
  if (user.role !== "supervisor") return { ...query, _id: null };
  const deptId = await resolveUserDepartmentId(user);
  if (!deptId) return { ...query, _id: null };
  const dept = await Department.findById(deptId).lean().exec();
  const deptName = dept?.name || user.department;
  return {
    ...query,
    role: "nurse",
    $or: [{ departmentId: deptId }, { department: deptName }],
  };
}
