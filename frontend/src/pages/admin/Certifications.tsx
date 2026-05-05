import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Award, 
  Download, 
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <span className="badge-success">Active</span>;
    case 'expiring':
      return <span className="badge-warning">Expiring Soon</span>;
    case 'expired':
      return <span className="badge-destructive">Expired</span>;
    default:
      return <span className="badge-neutral">Unknown</span>;
  }
};

export default function AdminCertifications() {
  const { authHeaders } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/certifications/overview`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Failed to load certifications');
        setOverview(data);
      } catch (err) {
        console.error(err);
        setOverview({ logs: [], totalCertified: 0, expiringCount: 0, nonCompliantCount: 0, completedThisMonth: 0 });
      }
    };
    void loadOverview();
  }, [authHeaders]);

  const certificationLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const logs = overview?.logs || [];
    if (!q) return logs;
    return logs.filter((l: any) =>
      String(l.nurse || '').toLowerCase().includes(q) ||
      String(l.department || '').toLowerCase().includes(q) ||
      String(l.course || '').toLowerCase().includes(q)
    );
  }, [overview, search]);

  const stats = [
    { label: 'Total Certified', value: overview?.totalCertified ?? 0, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Expiring (30 days)', value: overview?.expiringCount ?? 0, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Non-Compliant', value: overview?.nonCompliantCount ?? 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Completed This Month', value: overview?.completedThisMonth ?? 0, icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance & Accreditation</h1>
            <p className="text-muted-foreground mt-1">
              Track certification status and compliance across departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download Audit Logs
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="healthcare-card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
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
              <Input
                placeholder="Search nurses or certifications..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="icu">ICU</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="pediatrics">Pediatrics</SelectItem>
                <SelectItem value="surgery">Surgery</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Certification Logs Table */}
        <div className="healthcare-card overflow-x-auto">
          <table className="table-healthcare">
            <thead>
              <tr>
                <th>Nurse Name</th>
                <th>Department</th>
                <th>Course</th>
                <th>Completion Date</th>
                <th>Expiry Date</th>
                <th>Score</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {certificationLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-medium text-foreground">{log.nurse}</td>
                  <td>{log.department}</td>
                  <td>{log.course}</td>
                  <td>{log.completionDate}</td>
                      <td>{log.expiryDate || '-'}</td>
                  <td>
                    <span className={`font-semibold ${
                      log.score >= 90 ? 'text-success' : log.score >= 80 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {log.score}%
                    </span>
                  </td>
                  <td>{getStatusBadge(log.status)}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3 mr-1" />
                      Certificate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing 1-{Math.min(certificationLogs.length, 6)} of {certificationLogs.length} records
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
