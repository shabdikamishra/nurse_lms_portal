import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Film, ClipboardCheck } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type AssignmentModule = { _id: string; title: string };
type AssignmentCourse = { _id: string; title: string };
type AssignmentItem = {
  _id: string;
  moduleId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  dueDate: string | null;
  module?: AssignmentModule;
  course?: AssignmentCourse;
};

type ModuleLesson = {
  _id: string;
  title: string;
  type: "pdf" | "video";
  fileUrl: string;
};

type ModuleSop = {
  _id: string;
  title: string;
  fileUrl: string;
};

export default function NurseModuleDetail() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [lessons, setLessons] = useState<ModuleLesson[]>([]);
  const [sops, setSops] = useState<ModuleSop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dueDateLabel = useMemo(() => {
    if (!assignment?.dueDate) return "No due date";
    return new Date(assignment.dueDate).toLocaleDateString();
  }, [assignment]);

  const statusClass =
    assignment?.status === "COMPLETED"
      ? "status-completed"
      : assignment?.status === "IN_PROGRESS"
      ? "status-inprogress"
      : "status-notstarted";

  useEffect(() => {
    const load = async () => {
      if (!assignmentId) return;
      setLoading(true);
      setError("");
      try {
        const assignedRes = await fetch(`${API_BASE_URL}/api/assignments/my-modules`, {
          headers: authHeaders(),
        });
        const assignedData = await assignedRes.json();
        if (!assignedRes.ok) {
          throw new Error(assignedData?.message || "Failed to load assignment");
        }
        const current = ((Array.isArray(assignedData) ? assignedData : []) as AssignmentItem[]).find(
          (item) => item._id === assignmentId
        );
        if (!current) throw new Error("Assignment not found");
        setAssignment(current);

        if (current.status === "NOT_STARTED") {
          await fetch(`${API_BASE_URL}/api/assignments/${current._id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: "IN_PROGRESS" }),
          });
          setAssignment((prev) => (prev ? { ...prev, status: "IN_PROGRESS" } : prev));
        }

        const [lessonsRes, sopsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/modules/${current.moduleId}/lessons`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/modules/${current.moduleId}/sops`, {
            headers: authHeaders(),
          }),
        ]);
        const lessonsData = await lessonsRes.json();
        const sopsData = await sopsRes.json();
        if (!lessonsRes.ok || !sopsRes.ok) {
          throw new Error("Failed to load module content");
        }
        setLessons(Array.isArray(lessonsData) ? lessonsData : []);
        setSops(Array.isArray(sopsData) ? sopsData : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load module");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assignmentId, authHeaders]);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Loading module details...</p>
      </DashboardLayout>
    );
  }

  if (error || !assignment) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          <p className="text-sm text-destructive">{error || "Assignment not found"}</p>
          <Button variant="outline" onClick={() => navigate("/modules")}>
            Back to Assigned Modules
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button variant="outline" onClick={() => navigate("/modules")}>
            Back
          </Button>
        </div>

        <div className="healthcare-card space-y-3">
          <h1 className="text-2xl font-bold">{assignment.module?.title}</h1>
          <p className="text-sm text-muted-foreground">Course: {assignment.course?.title}</p>
          <p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
              {assignment.status === "COMPLETED"
                ? "🟢 Completed"
                : assignment.status === "IN_PROGRESS"
                ? "🔵 In Progress"
                : "⚪ Not Started"}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">Due Date: {dueDateLabel}</p>
          <div className="flex flex-wrap gap-2">
            <span className="content-tag content-tag-lesson">📄 {lessons.length} Lessons</span>
            <span className="content-tag content-tag-video">🎥 Videos/PDF</span>
            <span className="content-tag content-tag-sop">📘 SOP</span>
            <span className="content-tag content-tag-quiz">📝 Quiz</span>
          </div>
        </div>

        <div className="healthcare-card space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-info" /> Lessons
          </h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lessons available.</p>
          ) : (
            lessons.map((lesson) => (
              <div key={lesson._id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div>
                  <p className="font-medium">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">{lesson.type.toUpperCase()}</p>
                </div>
                <a href={`${API_BASE_URL}${lesson.fileUrl}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    {lesson.type === "video" ? (
                      <>
                        <Film className="w-4 h-4 mr-1 text-purple-500" /> Stream
                      </>
                    ) : (
                      "Open"
                    )}
                  </Button>
                </a>
              </div>
            ))
          )}
        </div>

        <div className="healthcare-card space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-warning" /> SOPs
          </h2>
          {sops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SOPs available.</p>
          ) : (
            sops.map((sop) => (
              <div key={sop._id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <p className="font-medium">{sop.title}</p>
                <a href={`${API_BASE_URL}${sop.fileUrl}`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    View / Download
                  </Button>
                </a>
              </div>
            ))
          )}
        </div>

        <div className="healthcare-card flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-success" /> Quiz
            </h2>
            <p className="text-sm text-muted-foreground">Complete the quiz to mark module as completed.</p>
          </div>
          <Button onClick={() => navigate(`/quiz?moduleId=${assignment.moduleId}`)}>
            Attempt Quiz
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
