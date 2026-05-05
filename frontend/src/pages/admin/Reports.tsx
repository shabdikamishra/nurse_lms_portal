import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Users, BookOpen, TrendingUp } from 'lucide-react';

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

type NurseProgress = {
  nurseId: string;
  nurseName: string;
  nurseEmail: string;
  totalAssignedModules: number;
  totalCoveredModules: number;
  overallPercent: number;
  courses: CourseProgress[];
};

export default function AdminReports() {
  const { authHeaders } = useAuth();
  const [rows, setRows] = useState<NurseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/reports/module-progress`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data?.message || 'Failed to load report');
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [authHeaders]);

  const totals = useMemo(() => {
    const nurses = rows.length;
    const assigned = rows.reduce((sum, x) => sum + x.totalAssignedModules, 0);
    const covered = rows.reduce((sum, x) => sum + x.totalCoveredModules, 0);
    const overallPercent = assigned ? Math.round((covered / assigned) * 100) : 0;
    return { nurses, assigned, covered, overallPercent };
  }, [rows]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Nurse module coverage by course (dynamic)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              Nurses
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{totals.nurses}</p>
          </div>
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BookOpen className="w-4 h-4" />
              Modules Covered
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {totals.covered}/{totals.assigned}
            </p>
          </div>
          <div className="healthcare-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Overall Coverage
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{totals.overallPercent}%</p>
          </div>
        </div>

        <div className="healthcare-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Nurse Progress by Course
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading progress report...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No nurse progress data yet.</p>
          ) : (
            <div className="space-y-5">
              {rows.map((nurse) => (
                <div key={nurse.nurseId} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{nurse.nurseName}</p>
                      <p className="text-xs text-muted-foreground">{nurse.nurseEmail}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {nurse.totalCoveredModules}/{nurse.totalAssignedModules} modules covered ({nurse.overallPercent}%)
                    </p>
                  </div>
                  <Progress value={nurse.overallPercent} className="h-2" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {nurse.courses.map((course) => (
                      <div key={course.courseId} className="rounded-md border border-border p-3">
                        <p className="text-sm font-medium text-foreground truncate">{course.courseTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Covered {course.coveredModules}/{course.totalModules} modules
                        </p>
                        <Progress value={course.percent} className="h-1.5 mt-2" />
                      </div>
                    ))}
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
