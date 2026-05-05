import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle2, TrendingUp } from 'lucide-react';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

type CourseProgress = {
  courseId: string;
  courseTitle: string;
  totalModules: number;
  coveredModules: number;
  completedModules: number;
  percent: number;
};

type MyReport = {
  nurseId: string;
  nurseName: string;
  nurseEmail: string;
  totalAssignedModules: number;
  totalCoveredModules: number;
  overallPercent: number;
  courses: CourseProgress[];
};

export default function NurseReports() {
  const { authHeaders } = useAuth();
  const [report, setReport] = useState<MyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/reports/my-module-progress`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Failed to load report');
        setReport(data);
      } catch (err) {
        console.error(err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    void loadReport();
  }, [authHeaders]);

  const completedCourses = useMemo(
    () => (report?.courses || []).filter((c) => c.percent === 100).length,
    [report]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
            <p className="text-muted-foreground mt-1">
              Track course-wise module progress
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BookOpen className="w-4 h-4" />
              Modules Covered
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {report?.totalCoveredModules || 0}/{report?.totalAssignedModules || 0}
            </p>
          </div>
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Overall Progress
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{report?.overallPercent || 0}%</p>
          </div>
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Courses Completed
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{completedCourses}</p>
          </div>
        </div>

        <div className="healthcare-card">
          <h3 className="text-lg font-semibold text-foreground mb-6">Course Coverage</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your progress...</p>
          ) : !report || report.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrolled course progress yet.</p>
          ) : (
            <div className="space-y-4">
              {report.courses.map((course) => (
                <div key={course.courseId} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground truncate">{course.courseTitle}</p>
                    <span className="text-xs text-muted-foreground">
                      {course.coveredModules}/{course.totalModules} modules
                    </span>
                  </div>
                  <Progress value={course.percent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {course.percent === 100
                      ? 'Completed'
                      : `${course.completedModules} completed, ${Math.max(course.coveredModules - course.completedModules, 0)} in progress`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
