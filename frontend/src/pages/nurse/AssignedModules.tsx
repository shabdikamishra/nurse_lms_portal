import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ModuleCard } from '@/components/nurse/ModuleCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const modules = [
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
  {
    id: 5,
    title: 'Medication Administration Safety',
    author: 'Dr. Lisa Thompson',
    thumbnail: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=225&fit=crop',
    status: 'in-progress' as const,
    duration: '1h 30m',
    progress: 30,
  },
  {
    id: 6,
    title: 'Patient Fall Prevention Protocols',
    author: 'Dr. Robert Garcia',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=225&fit=crop',
    status: 'completed' as const,
    duration: '1h 15m',
  },
  {
    id: 7,
    title: 'Infection Control & Prevention',
    author: 'Dr. Amanda Foster',
    thumbnail: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400&h=225&fit=crop',
    status: 'not-started' as const,
    duration: '2h 00m',
  },
  {
    id: 8,
    title: 'Blood Transfusion Protocols',
    author: 'Dr. James Peterson',
    thumbnail: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400&h=225&fit=crop',
    status: 'not-started' as const,
    duration: '1h 45m',
  },
];

const stats = [
  { label: 'Total Modules', value: 18, icon: BookOpen, color: 'text-primary' },
  { label: 'In Progress', value: 4, icon: PlayCircle, color: 'text-warning' },
  { label: 'Completed', value: 12, icon: CheckCircle2, color: 'text-success' },
  { label: 'Hours Remaining', value: '24h', icon: Clock, color: 'text-muted-foreground' },
];

export default function AssignedModules() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Assigned Modules</h1>
            <p className="text-muted-foreground mt-1">
              Your personalized learning curriculum
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="healthcare-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="healthcare-card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search modules..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="icu">ICU</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="pediatrics">Pediatrics</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard key={module.id} {...module} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing 1-8 of 18 modules
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
