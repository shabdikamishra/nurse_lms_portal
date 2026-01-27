import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Download, 
  TrendingUp,
  Users,
  Award,
  Clock,
  FileText,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const complianceTrend = [
  { month: 'Aug', rate: 88 },
  { month: 'Sep', rate: 90 },
  { month: 'Oct', rate: 87 },
  { month: 'Nov', rate: 92 },
  { month: 'Dec', rate: 94 },
  { month: 'Jan', rate: 96 },
];

const departmentCompletion = [
  { department: 'ICU', completion: 94 },
  { department: 'Emergency', completion: 89 },
  { department: 'Pediatrics', completion: 92 },
  { department: 'Surgery', completion: 85 },
  { department: 'Oncology', completion: 91 },
  { department: 'Cardiology', completion: 88 },
];

const certificationStatus = [
  { name: 'Active', value: 1156, color: 'hsl(var(--success))' },
  { name: 'Expiring Soon', value: 89, color: 'hsl(var(--warning))' },
  { name: 'Expired', value: 23, color: 'hsl(var(--destructive))' },
];

const stats = [
  { label: 'Overall Compliance', value: '96%', subtitle: '+2% from last month', icon: TrendingUp, color: 'text-success' },
  { label: 'Active Learners', value: '1,198', subtitle: 'This month', icon: Users, color: 'text-primary' },
  { label: 'Certifications Issued', value: '234', subtitle: 'This month', icon: Award, color: 'text-warning' },
  { label: 'Avg. Completion Time', value: '4.2h', subtitle: 'Per module', icon: Clock, color: 'text-info' },
];

const reportTypes = [
  { id: 1, name: 'Compliance Summary Report', description: 'Overview of training compliance across all departments', type: 'PDF' },
  { id: 2, name: 'Certification Status Report', description: 'Current status of all nurse certifications', type: 'Excel' },
  { id: 3, name: 'Learning Progress Report', description: 'Detailed progress tracking for all modules', type: 'PDF' },
  { id: 4, name: 'Department Performance Report', description: 'Performance metrics by department', type: 'Excel' },
  { id: 5, name: 'Quiz Analytics Report', description: 'Quiz scores and performance analytics', type: 'PDF' },
  { id: 6, name: 'Audit Trail Report', description: 'Complete audit log of all training activities', type: 'Excel' },
];

export default function AdminReports() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Institutional reports and training analytics
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
              Export All
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Trend */}
          <div className="healthcare-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Compliance Trend</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={complianceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[80, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}%`, 'Compliance Rate']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--success))" 
                    fill="hsl(var(--success) / 0.2)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Certification Status */}
          <div className="healthcare-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Certification Status</h3>
              <Award className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={certificationStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {certificationStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              {certificationStatus.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Completion */}
          <div className="healthcare-card lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Department Completion Rates</h3>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentCompletion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                  <YAxis type="category" dataKey="department" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}%`, 'Completion Rate']}
                  />
                  <Bar 
                    dataKey="completion" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div className="healthcare-card">
          <h3 className="text-lg font-semibold text-foreground mb-6">Available Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => (
              <div key={report.id} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {report.type}
                  </span>
                </div>
                <h4 className="font-medium text-foreground mb-1">{report.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
