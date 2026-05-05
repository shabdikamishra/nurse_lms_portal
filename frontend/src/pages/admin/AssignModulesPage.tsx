import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

export default function AssignModulesPage() {
  const { authHeaders } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [dueDateEditById, setDueDateEditById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [selectedNurseIds, setSelectedNurseIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  const filteredCourses = useMemo(
    () => courses.filter((c) => !departmentId || c.departmentId === departmentId),
    [courses, departmentId]
  );

  const loadBase = async () => {
    const [deptRes, courseRes, usersRes, assnRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/departments`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/api/courses`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/api/assignments`, { headers: authHeaders() }),
    ]);
    const deptData = await deptRes.json();
    const courseData = await courseRes.json();
    const usersData = await usersRes.json();
    const assnData = await assnRes.json();
    setDepartments(Array.isArray(deptData) ? deptData : []);
    setCourses(Array.isArray(courseData) ? courseData : []);
    setNurses((Array.isArray(usersData) ? usersData : []).filter((u) => u.role === "nurse"));
    setAssignments(Array.isArray(assnData) ? assnData : []);
  };

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    const loadModules = async () => {
      if (!courseId) {
        setModules([]);
        setSelectedModuleIds([]);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/modules`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setModules(Array.isArray(data) ? data : []);
      setSelectedModuleIds([]);
    };
    void loadModules();
  }, [courseId, authHeaders]);

  const toggleSelection = (id: string, current: string[], setter: (value: string[]) => void) => {
    if (current.includes(id)) {
      setter(current.filter((x) => x !== id));
    } else {
      setter([...current, id]);
    }
  };

  const handleAssign = async () => {
    setMessage("");
    const payload = {
      nurseIds: selectedNurseIds,
      courseId,
      moduleIds: selectedModuleIds,
      dueDate: dueDate || undefined,
    };
    const res = await fetch(`${API_BASE_URL}/api/assignments`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(data?.message || "Failed to assign modules");
      return;
    }
    setMessage("Modules assigned successfully");
    await loadBase();
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadBase();
    }
  };

  const handleDueDateUpdate = async (id: string) => {
    const nextDate = dueDateEditById[id];
    const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: nextDate || null }),
    });
    if (res.ok) {
      await loadBase();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assign Modules</h1>
          <p className="text-sm text-muted-foreground">
            Assign module-level or course-level content to nurses.
          </p>
        </div>

        <div className="healthcare-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-sm mb-1">Department</p>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm mb-1">Course</p>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Select Course</option>
                {filteredCourses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm mb-1">Due Date (optional)</p>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Modules</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedModuleIds(modules.map((m) => m._id))}
                >
                  Select All
                </Button>
              </div>
              {modules.map((m) => (
                <label key={m._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedModuleIds.includes(m._id)}
                    onChange={() =>
                      toggleSelection(m._id, selectedModuleIds, setSelectedModuleIds)
                    }
                  />
                  {m.title}
                </label>
              ))}
            </div>

            <div className="border rounded-md p-3 space-y-2 max-h-72 overflow-auto">
              <p className="font-medium">Nurses</p>
              {nurses.map((n) => (
                <label key={n._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedNurseIds.includes(n._id)}
                    onChange={() =>
                      toggleSelection(n._id, selectedNurseIds, setSelectedNurseIds)
                    }
                  />
                  {n.name} ({n.email})
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleAssign}>Assign Modules</Button>
          {message && <p className="text-sm text-primary">{message}</p>}
        </div>

        <div className="healthcare-card space-y-3">
          <h2 className="text-lg font-semibold">Assigned Modules</h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            assignments.map((a) => (
              <div key={a._id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {a?.nurseId?.name} - {a?.moduleId?.title}
                  </p>
                  <p className="text-muted-foreground">
                    {a?.courseId?.title} | Status: {a.status} | Due:{" "}
                    {a?.dueDate ? new Date(a.dueDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm bg-background"
                    value={dueDateEditById[a._id] ?? (a?.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : "")}
                    onChange={(e) =>
                      setDueDateEditById((prev) => ({ ...prev, [a._id]: e.target.value }))
                    }
                  />
                  <Button variant="outline" size="sm" onClick={() => handleDueDateUpdate(a._id)}>
                    Update Due Date
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRemove(a._id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
