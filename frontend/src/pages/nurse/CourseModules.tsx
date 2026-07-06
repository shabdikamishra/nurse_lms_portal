import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  PlayCircle,
  Circle,
  ClipboardCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

type ModuleItem = {
  _id: string;
  title: string;
  order: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  progressPercent: number;
  quizPassed: boolean;
  quizScore: number | null;
  unlocked: boolean;
  estimatedDuration?: string;
};

type CourseInfo = {
  _id: string;
  title: string;
  description?: string;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  department?: { name: string };
};

export default function CourseModules() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!courseId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/nurse/courses/${courseId}/modules`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load course modules");
        }
        setCourse(data.course);
        setModules(data.modules || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load course");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [courseId, authHeaders]);

  const handleModuleClick = (mod: ModuleItem) => {
    if (mod.status === "LOCKED" || !mod.unlocked) {
      setLockDialogOpen(true);
      return;
    }
    navigate(`/courses/${courseId}/modules/${mod._id}`);
  };

  const statusStyles: Record<ModuleItem["status"], string> = {
    COMPLETED: "border-success/40 bg-success/5",
    IN_PROGRESS: "border-primary/40 bg-primary/5",
    NOT_STARTED: "border-border bg-card",
    LOCKED: "border-muted bg-muted/40 opacity-70",
  };

  const statusIcon = (status: ModuleItem["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "IN_PROGRESS":
        return <PlayCircle className="w-5 h-5 text-primary" />;
      case "LOCKED":
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Loading course modules...</p>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-destructive">{error || "Course not found"}</p>
          <Button variant="outline" onClick={() => navigate("/modules")}>
            Back to My Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="outline" onClick={() => navigate("/modules")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to My Courses
        </Button>

        <div className="healthcare-card space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-sm text-muted-foreground">
              {course.department?.name || "Department"} · {course.totalModules} modules
            </p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Course Progress</span>
              <span className="font-semibold">{course.progressPercent}%</span>
            </div>
            <Progress value={course.progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {course.completedModules} of {course.totalModules} modules completed
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {modules.map((mod) => (
            <button
              key={mod._id}
              type="button"
              onClick={() => handleModuleClick(mod)}
              disabled={mod.status === "LOCKED"}
              className={`w-full text-left healthcare-card border-2 transition-all ${statusStyles[mod.status]} ${
                mod.status !== "LOCKED" ? "hover:shadow-md cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">{statusIcon(mod.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      Module {mod.order}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        mod.status === "COMPLETED"
                          ? "bg-success/10 text-success"
                          : mod.status === "IN_PROGRESS"
                            ? "bg-primary/10 text-primary"
                            : mod.status === "LOCKED"
                              ? "bg-muted text-muted-foreground"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mod.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-1">{mod.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{mod.progressPercent}% complete</span>
                    {mod.quizScore !== null && (
                      <span className="flex items-center gap-1">
                        <ClipboardCheck className="w-3 h-3" />
                        Quiz: {mod.quizScore}%
                        {mod.quizPassed ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Module Locked
            </DialogTitle>
            <DialogDescription>
              Please complete the previous module and pass the quiz before accessing this module.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setLockDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
