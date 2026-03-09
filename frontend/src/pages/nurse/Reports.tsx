import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Clock,
  Target,
  Award,
  TrendingUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

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

const stats = [
  { label: 'Total Hours', value: '142h', subtitle: 'All time', icon: Clock, color: 'text-primary' },
  { label: 'Avg. Quiz Score', value: '85%', subtitle: '+5% this month', icon: Target, color: 'text-success' },
  { label: 'Certifications', value: '6', subtitle: 'Active', icon: Award, color: 'text-warning' },
  { label: 'Learning Streak', value: '12', subtitle: 'Days', icon: TrendingUp, color: 'text-info' },
];

const moduleProgress = [
  { name: 'Ventilator Management', progress: 100, status: 'Completed' },
  { name: 'IV Medication Safety', progress: 100, status: 'Completed' },
  { name: 'CPR & ACLS', progress: 100, status: 'Completed' },
  { name: 'Sepsis Recognition', progress: 45, status: 'In Progress' },
  { name: 'Infection Control', progress: 20, status: 'In Progress' },
  { name: 'Blood Transfusion', progress: 0, status: 'Not Started' },
];

export default function NurseReports() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
            <p className="text-muted-foreground mt-1">
              Track your learning progress and performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="6months">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="healthcare-card">
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Module Progress */}
        <div className="healthcare-card">
          <h3 className="text-lg font-semibold text-foreground mb-6">Module Progress</h3>
          <div className="space-y-4">
            {moduleProgress.map((module) => (
              <div key={module.name} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{module.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      module.status === 'Completed' ? 'bg-success/10 text-success' :
                      module.status === 'In Progress' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {module.status}
                    </span>
                  </div>
                  <Progress value={module.progress} className="h-2" />
                </div>
                <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                  {module.progress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
