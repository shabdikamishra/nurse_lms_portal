import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

const stats = [
  { label: 'Total Modules', value: 18, icon: BookOpen, color: 'text-primary' },
  { label: 'In Progress', value: 4, icon: PlayCircle, color: 'text-warning' },
  { label: 'Completed', value: 12, icon: CheckCircle2, color: 'text-success' },
  { label: 'Hours Remaining', value: '24h', icon: Clock, color: 'text-muted-foreground' },
];

export default function AssignedModules() {
  const { authHeaders } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [departmentId, setDepartmentId] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/me/modules`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load modules');
        const data = await res.json();
        setModules(data);
      } catch {
        setModules([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const departments = useMemo(() => {
    const map = new Map<string, { _id: string; name: string }>();
    for (const m of modules) {
      if (m?.department?._id) {
        map.set(m.department._id, m.department);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [modules]);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((m) => {
      const matchesSearch =
        !q ||
        String(m.title || '').toLowerCase().includes(q) ||
        String(m.course?.title || '').toLowerCase().includes(q) ||
        String(m.department?.name || '').toLowerCase().includes(q);
      const matchesStatus =
        status === 'all' ? true : m.progress?.status === status;
      const matchesDept =
        departmentId === 'all' ? true : m.department?._id === departmentId;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [modules, search, status, departmentId]);

  const computedStats = useMemo(() => {
    const total = modules.length;
    const inProgress = modules.filter((m) => m.progress?.status === 'in-progress').length;
    const completed = modules.filter((m) => m.progress?.status === 'completed').length;
    return { total, inProgress, completed };
  }, [modules]);

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
          {stats.map((stat) => {
            const value =
              stat.label === 'Total Modules'
                ? computedStats.total
                : stat.label === 'In Progress'
                  ? computedStats.inProgress
                  : stat.label === 'Completed'
                    ? computedStats.completed
                    : stat.value;
            return (
            <div key={stat.label} className="healthcare-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          )})}
        </div>

        {/* Filters */}
        <div className="healthcare-card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
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
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                  </SelectItem>
                ))}
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
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading modules...</p>
          ) : filteredModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No modules assigned yet.</p>
          ) : (
            filteredModules.map((module) => (
              <ModuleCard
                key={module._id}
                title={module.title}
                author={module.course?.title || 'Course'}
                thumbnail="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=225&fit=crop"
                status={module.progress?.status}
                progress={module.progress?.percent}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing 1-{Math.min(filteredModules.length, 8)} of {filteredModules.length} modules
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
