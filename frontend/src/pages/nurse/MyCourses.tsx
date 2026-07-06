import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, CheckCircle2, PlayCircle, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

type RegisteredCourse = {
  _id: string;
  title: string;
  description?: string;
  department?: { _id: string; name: string } | null;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
  registeredAt?: string;
};

export default function MyCourses() {
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/nurse/my-courses`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load courses");
        setCourses(Array.isArray(data) ? data : []);
      } catch {
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [authHeaders]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        String(c.department?.name || "").toLowerCase().includes(q)
    );
  }, [courses, search]);

  const stats = useMemo(() => {
    const total = courses.length;
    const inProgress = courses.filter(
      (c) => c.progressPercent > 0 && c.progressPercent < 100
    ).length;
    const completed = courses.filter((c) => c.progressPercent === 100).length;
    return { total, inProgress, completed };
  }, [courses]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground mt-1">
            Courses you are registered for by your administrator
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="healthcare-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Registered Courses</p>
            </div>
          </div>
          <div className="healthcare-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-warning">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="healthcare-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-success">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        <div className="healthcare-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses...</p>
        ) : filteredCourses.length === 0 ? (
          <div className="healthcare-card text-center py-12">
            <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">You are not registered for any courses yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact your administrator to get registered for training courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course._id}
                className="healthcare-card-hover cursor-pointer"
                onClick={() => navigate(`/courses/${course._id}`)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {course.department?.name || "Department"}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        course.progressPercent === 100
                          ? "bg-success/10 text-success"
                          : course.progressPercent > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {course.progressPercent === 100
                        ? "✅ Complete"
                        : course.progressPercent > 0
                          ? "🔵 In Progress"
                          : "⚪ Not Started"}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progressPercent}%</span>
                    </div>
                    <Progress value={course.progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {course.completedModules} of {course.totalModules} modules completed
                    </p>
                  </div>

                  <Button className="w-full" size="sm">
                    View Modules
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
