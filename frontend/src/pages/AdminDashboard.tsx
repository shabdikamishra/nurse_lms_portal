import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/shared/StatsCard';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Award, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Calendar,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

const activityIcons = {
  completion: { icon: Award, className: 'text-success bg-success/10' },
  registration: { icon: Calendar, className: 'text-info bg-info/10' },
  warning: { icon: Clock, className: 'text-warning bg-warning/10' },
  publish: { icon: BookOpen, className: 'text-primary bg-primary/10' },
  alert: { icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

export default function AdminDashboard() {
  const { user, authHeaders } = useAuth();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/dashboard-summary`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Failed to load dashboard');
        setSummary(data);
      } catch (err) {
        console.error(err);
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSummary();
  }, [authHeaders]);

  if (!user) return null;

  const recentActivity = (summary?.recentActivity || []).map((a: any, idx: number) => ({
    id: idx + 1,
    action: `Quiz attempt: score ${a.score}/${a.totalQuestions || 0}`,
    time: a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Recent',
    type: (a.totalQuestions && a.score / a.totalQuestions < 0.7) ? 'alert' : 'completion',
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of training compliance and institutional metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowScheduleModal(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Certified Nurses"
            value={isLoading ? '...' : String(summary?.nursesCount ?? 0)}
            subtitle="Active nurses"
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Certifications Due"
            value={isLoading ? '...' : String(summary?.expiringSoonCount ?? 0)}
            subtitle="Within 30 days"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="Non-Compliant"
            value={isLoading ? '...' : String(summary?.nonCompliantCount ?? 0)}
            subtitle="Requires action"
            icon={AlertTriangle}
            variant="destructive"
          />
          <StatsCard
            title="Completed This Month"
            value={isLoading ? '...' : String(summary?.completedThisMonth ?? 0)}
            subtitle="Progress updates"
            icon={Award}
            variant="default"
          />
        </div>

        {/* Recent Activity */}
        <div className="healthcare-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {(recentActivity.length ? recentActivity : [{ id: 0, action: 'No activity yet', time: '', type: 'publish' }]).map((activity) => {
              const { icon: Icon, className } = activityIcons[activity.type as keyof typeof activityIcons];
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{activity.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Session Modal */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Calendar */}
              <div>
                <label className="text-sm font-medium text-foreground">Select Date</label>
                <div className="border rounded-lg p-4 bg-card mt-2">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Session Title</label>
                  <Input 
                    placeholder="e.g., Ventilator Training" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Time</label>
                  <Input 
                    type="time" 
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icu">ICU</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Session Type</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live Session</SelectItem>
                      <SelectItem value="module">Module</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea 
                  placeholder="Enter session description" 
                  className="w-full border rounded-lg p-2 mt-1 bg-background text-foreground placeholder-muted-foreground"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button>
                  Create Schedule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
