import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export function AdminApprovalAlert() {
  const { user, authHeaders } = useAuth();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/pending-courses`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data) && data.length > 0) {
          setCount(data.length);
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [user?.email, authHeaders]);

  if (user?.role !== 'admin') return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Course approval required</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1
              ? 'A supervisor has submitted a course for approval.'
              : `${count} supervisor courses are waiting for your approval.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <AlertDialogAction asChild>
            <Link to="/admin/pending-approvals">Review pending approvals</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
