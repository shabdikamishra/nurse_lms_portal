import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/shared/StatsCard';
import { UserTable } from '@/components/admin/UserTable';
import { ComplianceChart } from '@/components/admin/ComplianceChart';
import { 
  Users, 
  Award, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Calendar,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const recentActivity = [
  { id: 1, action: 'Sarah Johnson completed "Ventilator Management"', time: '2 hours ago', type: 'completion' },
  { id: 2, action: 'James Wilson registered for "Pediatric Emergency Response"', time: '3 hours ago', type: 'registration' },
  { id: 3, action: 'Maria Garcia\'s BLS certification expires in 7 days', time: '5 hours ago', type: 'warning' },
  { id: 4, action: 'New module "Infection Control 2025" published', time: '1 day ago', type: 'publish' },
  { id: 5, action: 'Robert Brown failed quiz "Medication Safety" - Retake required', time: '1 day ago', type: 'alert' },
];

const activityIcons = {
  completion: { icon: Award, className: 'text-success bg-success/10' },
  registration: { icon: Calendar, className: 'text-info bg-info/10' },
  warning: { icon: Clock, className: 'text-warning bg-warning/10' },
  publish: { icon: BookOpen, className: 'text-primary bg-primary/10' },
  alert: { icon: AlertTriangle, className: 'text-destructive bg-destructive/10' },
};

export default function AdminDashboard() {
  const { user } = useAuth();

  if (!user) return null;

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
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
            <Button>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Certified Nurses"
            value="1,247"
            subtitle="Active staff"
            icon={Users}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Certifications Due"
            value="89"
            subtitle="Within 30 days"
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="Non-Compliant"
            value="23"
            subtitle="Requires action"
            icon={AlertTriangle}
            variant="destructive"
          />
          <StatsCard
            title="Expiring Soon"
            value="156"
            subtitle="Within 90 days"
            icon={Award}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compliance Chart */}
          <div className="lg:col-span-2">
            <ComplianceChart />
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
              {recentActivity.map((activity) => {
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
        </div>

        {/* User Management Table */}
        <UserTable />
      </div>
    </DashboardLayout>
  );
}
