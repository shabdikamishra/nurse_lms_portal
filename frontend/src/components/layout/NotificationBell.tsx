import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  courseId?: string;
};

export function NotificationBell() {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const [countRes, listRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/notifications`, { headers: authHeaders() }),
      ]);
      const countData = await countRes.json().catch(() => ({ count: 0 }));
      const listData = await listRes.json().catch(() => []);
      if (countRes.ok) setCount(countData.count ?? 0);
      if (listRes.ok) setItems(Array.isArray(listData) ? listData : []);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const markRead = async (id: string) => {
    await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    void load();
  };

  const handleClick = (n: NotificationItem) => {
    void markRead(n._id);
    if (user?.role === 'admin' && n.type === 'COURSE_APPROVAL_REQUEST') {
      navigate('/admin/pending-approvals');
      setOpen(false);
    }
    if (
      user?.role === 'supervisor' &&
      (n.type === 'COURSE_APPROVED' || n.type === 'COURSE_REJECTED')
    ) {
      navigate('/supervisor/course-library');
      setOpen(false);
    }
  };

  if (!user || user.role === 'nurse') return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-medium">Notifications</div>
        <div className="max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications</p>
          ) : (
            items.slice(0, 10).map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full border-b px-4 py-3 text-left text-sm hover:bg-muted/50 ${
                  !n.read ? 'bg-primary/5' : ''
                }`}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground line-clamp-2">{n.message}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
