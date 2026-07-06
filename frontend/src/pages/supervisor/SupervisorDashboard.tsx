import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/shared/StatsCard';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, Clock, CheckCircle, FileEdit, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export default function SupervisorDashboard() {
  const { user, authHeaders } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/supervisor/dashboard-summary`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok) setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [authHeaders]);

  if (!user) return null;

  const courses = summary?.courses || {
    draft: 0,
    pending: 0,
    published: 0,
    rejected: 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supervisor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {summary?.departmentName || user.department} — department training overview
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Department Nurses"
            value={loading ? '—' : String(summary?.nurses ?? 0)}
            icon={Users}
            trend="neutral"
          />
          <StatsCard
            title="Published Courses"
            value={loading ? '—' : String(courses.published ?? 0)}
            icon={CheckCircle}
            trend="neutral"
          />
          <StatsCard
            title="Pending Approval"
            value={loading ? '—' : String(courses.pending ?? 0)}
            icon={Clock}
            trend="neutral"
          />
          <StatsCard
            title="Draft Courses"
            value={loading ? '—' : String(courses.draft ?? 0)}
            icon={FileEdit}
            trend="neutral"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course pipeline
            </h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Draft</span>
                <span className="font-medium">{courses.draft}</span>
              </li>
              <li className="flex justify-between">
                <span>Pending admin approval</span>
                <span className="font-medium text-orange-600">{courses.pending}</span>
              </li>
              <li className="flex justify-between">
                <span>Published</span>
                <span className="font-medium text-green-600">{courses.published}</span>
              </li>
              <li className="flex justify-between">
                <span>Rejected</span>
                <span className="font-medium text-red-600">{courses.rejected}</span>
              </li>
            </ul>
            <Button asChild className="mt-4 w-full">
              <Link to="/supervisor/course-library">
                Manage courses
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="font-semibold mb-4">Quick actions</h2>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link to="/supervisor/register-nurse">Register nurse to course</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/supervisor/assign-modules">Assign modules</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/supervisor/course-library">Create / edit courses</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
