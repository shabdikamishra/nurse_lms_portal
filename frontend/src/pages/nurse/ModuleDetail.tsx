import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, FileText, Film, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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

type ModuleProgress = {
  status: string;
  unlocked: boolean;
  percent: number;
  quizPassed: boolean;
  quizScore: number | null;
  lessonsViewed: string[];
  sopsViewed: string[];
  contentViewed: boolean;
  contentRequirements: {
    lessonsTotal: number;
    sopsTotal: number;
    contentRequired: boolean;
  };
};

export default function NurseModuleDetail() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();

  const [moduleTitle, setModuleTitle] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<ModuleLesson[]>([]);
  const [sops, setSops] = useState<ModuleSop[]>([]);
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [hasModuleContent, setHasModuleContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const viewedLessonSet = useMemo(
    () => new Set((progress?.lessonsViewed || []).map(String)),
    [progress]
  );
  const viewedSopSet = useMemo(
    () => new Set((progress?.sopsViewed || []).map(String)),
    [progress]
  );

  const loadProgress = async () => {
    if (!moduleId) return;
    const res = await fetch(`${API_BASE_URL}/api/modules/${moduleId}/progress/me`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (res.ok) setProgress(data);
  };

  useEffect(() => {
    const load = async () => {
      if (!moduleId || !courseId) return;
      setLoading(true);
      setError("");
      try {
        const courseRes = await fetch(
          `${API_BASE_URL}/api/nurse/courses/${courseId}/modules`,
          { headers: authHeaders() }
        );
        const courseData = await courseRes.json();
        if (!courseRes.ok) {
          throw new Error(courseData?.message || "Failed to load course");
        }
        const currentModule = (courseData.modules || []).find(
          (m: { _id: string }) => m._id === moduleId
        );
        if (!currentModule) throw new Error("Module not found");
        if (currentModule.status === "LOCKED") {
          throw new Error(
            "Please complete the previous module and pass the quiz before accessing this module."
          );
        }
        setModuleTitle(currentModule.title);
        setCourseTitle(courseData.course?.title || "Course");

        const [lessonsRes, sopsRes, progressRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/modules/${moduleId}/lessons`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/modules/${moduleId}/sops`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/modules/${moduleId}/progress/me`, {
            headers: authHeaders(),
          }),
        ]);

        const lessonsData = await lessonsRes.json();
        const sopsData = await sopsRes.json();
        const progressData = await progressRes.json();

        if (!lessonsRes.ok || !sopsRes.ok) {
          throw new Error("Failed to load module content");
        }
        setLessons(Array.isArray(lessonsData) ? lessonsData : []);
        setSops(Array.isArray(sopsData) ? sopsData : []);
        if (progressRes.ok) {
          setProgress(progressData);
          setHasModuleContent(!!progressData?.contentRequirements?.contentRequired);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load module");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [courseId, moduleId, authHeaders]);

  const markLessonViewed = async (lessonId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/modules/${moduleId}/progress/view-lesson`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      await loadProgress();
    } catch {
      toast.error("Failed to track lesson progress");
    }
  };

  const markSopViewed = async (sopId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/modules/${moduleId}/progress/view-sop`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sopId }),
      });
      await loadProgress();
    } catch {
      toast.error("Failed to track SOP progress");
    }
  };

  const markContentViewed = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/modules/${moduleId}/progress/view-content`, {
        method: "POST",
        headers: authHeaders(),
      });
      await loadProgress();
      toast.success("Module content marked as viewed");
    } catch {
      toast.error("Failed to track content progress");
    }
  };

  const statusClass =
    progress?.status === "COMPLETED"
      ? "status-completed"
      : progress?.status === "IN_PROGRESS"
        ? "status-inprogress"
        : "status-notstarted";

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Loading module details...</p>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
          Back to Course
        </Button>

        <div className="healthcare-card space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{moduleTitle}</h1>
            <p className="text-sm text-muted-foreground">Course: {courseTitle}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
            {progress?.status === "COMPLETED"
              ? "🟢 Completed"
              : progress?.status === "IN_PROGRESS"
                ? "🔵 In Progress"
                : "⚪ Not Started"}
          </span>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Module Progress</span>
              <span>{progress?.percent ?? 0}%</span>
            </div>
            <Progress value={progress?.percent ?? 0} className="h-2" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="content-tag content-tag-lesson">
              Lessons {viewedLessonSet.size}/{lessons.length}
            </span>
            <span className="content-tag content-tag-sop">
              SOPs {viewedSopSet.size}/{sops.length}
            </span>
            <span className="content-tag content-tag-quiz">
              Quiz {progress?.quizPassed ? "✅ Passed" : progress?.quizScore !== null ? "❌ Failed" : "Pending"}
            </span>
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
                <div className="flex items-center gap-2">
                  {viewedLessonSet.has(lesson._id) && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                  <div>
                    <p className="font-medium">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.type.toUpperCase()}</p>
                  </div>
                </div>
                <a
                  href={`${API_BASE_URL}${lesson.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void markLessonViewed(lesson._id)}
                >
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

        {hasModuleContent && (
          <div className="healthcare-card flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Module Content</h2>
              <p className="text-sm text-muted-foreground">
                {progress?.contentViewed ? "Viewed" : "Required before quiz completion"}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`${API_BASE_URL}/api/modules/${moduleId}/content/download`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline">Open</Button>
              </a>
              {!progress?.contentViewed && (
                <Button size="sm" onClick={() => void markContentViewed()}>
                  Mark Viewed
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="healthcare-card space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-warning" /> SOPs
          </h2>
          {sops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SOPs available.</p>
          ) : (
            sops.map((sop) => (
              <div key={sop._id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div className="flex items-center gap-2">
                  {viewedSopSet.has(sop._id) && (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  )}
                  <p className="font-medium">{sop.title}</p>
                </div>
                <a
                  href={`${API_BASE_URL}${sop.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void markSopViewed(sop._id)}
                >
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
            <p className="text-sm text-muted-foreground">
              Pass the quiz after viewing all lessons and SOPs to complete this module.
            </p>
          </div>
          <Button onClick={() => navigate(`/quiz?moduleId=${moduleId}&courseId=${courseId}`)}>
            {progress?.quizPassed ? "Retake Quiz" : "Attempt Quiz"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
