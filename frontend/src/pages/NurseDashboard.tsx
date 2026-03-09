import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NurseProfileCard } from '@/components/nurse/NurseProfileCard';
import { QuickActions } from '@/components/nurse/QuickActions';
import { LiveClassCard } from '@/components/nurse/LiveClassCard';
import { StatsCard } from '@/components/shared/StatsCard';
import { 
  CheckCircle2, 
  Clock, 
  Target, 
  TrendingUp,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Mock data
const learningTrend = [
  { month: 'Aug', hours: 12 },
  { month: 'Sep', hours: 18 },
  { month: 'Oct', hours: 15 },
  { month: 'Nov', hours: 22 },
  { month: 'Dec', hours: 28 },
  { month: 'Jan', hours: 47 },
];

const quizPerformance = [
  { module: 'Ventilator', score: 92 },
  { module: 'IV Safety', score: 88 },
  { module: 'CPR', score: 95 },
  { module: 'Sepsis', score: 65 },
  { module: 'Fall Prev.', score: 78 },
  { module: 'Med Admin', score: 82 },
];

// Mock data
const assignedModules = [
  {
    id: 1,
    title: 'Ventilator Management & Patient Monitoring',
    author: 'Dr. Sarah Mitchell',
    thumbnail: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=225&fit=crop',
    status: 'in-progress' as const,
    duration: '2h 30m',
    progress: 65,
  },
  {
    id: 2,
    title: 'IV Medication & Infusion Pump Safety',
    author: 'Prof. James Wilson',
    thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=225&fit=crop',
    status: 'not-started' as const,
    duration: '1h 45m',
  },
  {
    id: 3,
    title: 'CPR & ACLS Certification Prep',
    author: 'Dr. Emily Chen',
    thumbnail: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400&h=225&fit=crop',
    status: 'completed' as const,
    duration: '3h 00m',
  },
  {
    id: 4,
    title: 'Sepsis Recognition & Early Intervention',
    author: 'Dr. Michael Brown',
    thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=225&fit=crop',
    status: 'not-started' as const,
    duration: '2h 15m',
  },
];

const upcomingClasses = [
  {
    id: 1,
    title: 'Advanced Wound Care Techniques',
    date: 'January 28, 2025',
    time: '10:00 AM - 12:00 PM',
    trainer: 'Dr. Lisa Thompson',
    trainerTitle: 'Wound Care Specialist',
    platform: 'Zoom',
    seatsAvailable: 12,
    totalSeats: 30,
    isRegistered: true,
  },
  {
    id: 2,
    title: 'Pediatric Emergency Response',
    date: 'January 30, 2025',
    time: '2:00 PM - 4:00 PM',
    trainer: 'Dr. Robert Garcia',
    trainerTitle: 'Pediatric ER Director',
    platform: 'Zoom',
    seatsAvailable: 5,
    totalSeats: 25,
    isRegistered: false,
  },
  {
    id: 3,
    title: 'Mental Health First Aid for Nurses',
    date: 'February 1, 2025',
    time: '9:00 AM - 11:00 AM',
    trainer: 'Dr. Amanda Foster',
    trainerTitle: 'Clinical Psychologist',
    platform: 'Zoom',
    seatsAvailable: 18,
    totalSeats: 40,
    isRegistered: false,
  },
];

export default function NurseDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your learning progress and upcoming activities
          </p>
        </div>

        {/* User Details Board - Top */}
        <NurseProfileCard 
          user={user} 
          completedModules={12} 
          totalModules={18} 
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Stats Overview - Progress Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Modules Completed"
            value="12"
            subtitle="of 18 total"
            icon={CheckCircle2}
            variant="success"
          />
          <StatsCard
            title="Hours Learned"
            value="47.5"
            subtitle="This month"
            icon={Clock}
            variant="primary"
          />
          <StatsCard
            title="Quiz Score Avg"
            value="92%"
            subtitle="+5% from last month"
            icon={Target}
            trend={{ value: 5, isPositive: true }}
          />
          <StatsCard
            title="Certifications"
            value="6"
            subtitle="2 expiring soon"
            icon={TrendingUp}
            variant="warning"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Learning Hours Trend */}
          <div className="healthcare-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Learning Hours Trend</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={learningTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quiz Performance */}
          <div className="healthcare-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Quiz Performance</h3>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quizPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="module" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="score" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Upcoming Live Classes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Upcoming Live Classes</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              View Calendar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {upcomingClasses.map((liveClass) => (
              <LiveClassCard key={liveClass.id} {...liveClass} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
