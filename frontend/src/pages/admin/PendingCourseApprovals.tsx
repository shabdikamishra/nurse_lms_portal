import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { courseStatusClass, normalizeCourseStatus } from '@/lib/courseStatus';
import { Check, X, Eye, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

type PendingCourse = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  departmentName: string;
  supervisorName: string;
  supervisorEmail: string;
  createdAt: string;
  submittedAt?: string;
};

export default function PendingCourseApprovals() {
  const { authHeaders } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectCourse, setRejectCourse] = useState<PendingCourse | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pending-courses`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [authHeaders]);

  const approve = async (course: PendingCourse) => {
    setActing(course._id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${course._id}/approve`,
        { method: 'PATCH', headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Approval failed');
      toast({ title: 'Course approved successfully.' });
      setCourses((prev) => prev.filter((c) => c._id !== course._id));
    } catch (err: any) {
      toast({
        title: 'Approval failed',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!rejectCourse) return;
    setActing(rejectCourse._id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${rejectCourse._id}/reject`,
        {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectionReason }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Rejection failed');
      toast({ title: 'Course rejected', description: 'Supervisor has been notified.' });
      setCourses((prev) => prev.filter((c) => c._id !== rejectCourse._id));
      setRejectCourse(null);
      setRejectionReason('');
    } catch (err: any) {
      toast({
        title: 'Rejection failed',
        description: err?.message,
        variant: 'destructive',
      });
    } finally {
      setActing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            Pending Course Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review supervisor-submitted courses before they go live for nurses.
          </p>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Course</th>
                <th className="text-left p-3 font-medium">Supervisor</th>
                <th className="text-left p-3 font-medium">Department</th>
                <th className="text-left p-3 font-medium">Submitted</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No courses pending approval.
                  </td>
                </tr>
              ) : (
                courses.map((course) => {
                  const status = normalizeCourseStatus(course.status);
                  return (
                    <tr key={course._id} className="border-t">
                      <td className="p-3 font-medium">{course.title}</td>
                      <td className="p-3">
                        <div>{course.supervisorName}</div>
                        <div className="text-xs text-muted-foreground">
                          {course.supervisorEmail}
                        </div>
                      </td>
                      <td className="p-3">{course.departmentName}</td>
                      <td className="p-3">
                        {course.submittedAt || course.createdAt
                          ? new Date(
                              course.submittedAt || course.createdAt
                            ).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${courseStatusClass[status]}`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/course-library?course=${course._id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void approve(course)}
                            disabled={acting === course._id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectCourse(course)}
                            disabled={acting === course._id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!rejectCourse} onOpenChange={() => setRejectCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject course</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rejecting &quot;{rejectCourse?.title}&quot;. Optional feedback for the
            supervisor:
          </p>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Please update Module 2 quiz questions."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectCourse(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void reject()}>
              Reject course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
