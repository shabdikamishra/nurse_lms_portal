import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, CheckCircle2 } from "lucide-react";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

type Nurse = {
  _id: string;
  name: string;
  email: string;
  empId: string;
  department: string;
};

type Course = {
  _id: string;
  title: string;
  departmentId: string;
  status?: string;
};

type Department = { _id: string; name: string };

type Enrollment = {
  _id: string;
  userId: Nurse;
  courseId: Course & { departmentId?: string };
  registeredAt: string;
  registeredBy?: { name: string };
};

export default function RegisterNursePage() {
  const { authHeaders } = useAuth();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedNurseId, setSelectedNurseId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignDate, setAssignDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  const selectedNurse = useMemo(
    () => nurses.find((n) => n._id === selectedNurseId) || null,
    [nurses, selectedNurseId]
  );

  const loadData = async () => {
    try {
      const [nursesRes, coursesRes, deptRes, enrollRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/courses`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/departments`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/admin/enrollments`, { headers: authHeaders() }),
      ]);
      const nursesData = await nursesRes.json();
      const coursesData = await coursesRes.json();
      const deptData = await deptRes.json();
      const enrollData = await enrollRes.json();
      setNurses(
        (Array.isArray(nursesData) ? nursesData : []).filter(
          (u: Nurse & { role: string }) => u.role === "nurse"
        )
      );
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setEnrollments(Array.isArray(enrollData) ? enrollData : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load registration data");
    }
  };

  useEffect(() => {
    void loadData();
  }, [authHeaders]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNurseId || !selectedCourseId) {
      toast.error("Please select a nurse and course");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/enrollments`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedNurseId,
          courseId: selectedCourseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Registration failed");
      toast.success("Nurse registered to course successfully");
      setSelectedNurseId("");
      setSelectedCourseId("");
      void loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary" />
            Register Nurse to Course
          </h1>
          <p className="text-muted-foreground mt-1">
            Nurses can only access course content after explicit registration
          </p>
        </div>

        <form onSubmit={handleRegister} className="healthcare-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nurse</Label>
              <Select value={selectedNurseId} onValueChange={setSelectedNurseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select nurse" />
                </SelectTrigger>
                <SelectContent>
                  {nurses.map((n) => (
                    <SelectItem key={n._id} value={n._id}>
                      {n.name} ({n.empId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNurse && (
              <>
                <div className="space-y-2">
                  <Label>Nurse ID</Label>
                  <Input value={selectedNurse.empId} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Nurse Name</Label>
                  <Input value={selectedNurse.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={selectedNurse.email} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={selectedNurse.department} readOnly />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Select Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.title} {c.status === "DRAFT" ? "(Draft)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign Date</Label>
              <Input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Registering..." : "Register Nurse"}
          </Button>
        </form>

        <div className="healthcare-card">
          <h2 className="text-lg font-semibold mb-4">Recent Registrations</h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <div className="space-y-2">
              {enrollments.slice(0, 10).map((e) => (
                <div
                  key={e._id}
                  className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{e.userId?.name}</p>
                    <p className="text-muted-foreground">{e.userId?.email}</p>
                  </div>
                  <div className="text-right">
                    <p>{e.courseId?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
