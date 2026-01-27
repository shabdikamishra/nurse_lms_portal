import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  Award, 
  Download, 
  Mail, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const myCertificates = [
  { 
    id: 1, 
    department: 'ICU', 
    name: 'Basic Life Support (BLS)', 
    type: 'Mandatory', 
    dateEarned: 'Jan 15, 2024',
    validUntil: 'Jan 15, 2026',
    status: 'active'
  },
  { 
    id: 2, 
    department: 'General', 
    name: 'Advanced Cardiac Life Support (ACLS)', 
    type: 'Mandatory', 
    dateEarned: 'Mar 20, 2024',
    validUntil: 'Mar 20, 2026',
    status: 'active'
  },
  { 
    id: 3, 
    department: 'ICU', 
    name: 'Critical Care Nursing Certification', 
    type: 'Optional', 
    dateEarned: 'Jun 10, 2024',
    validUntil: 'Jun 10, 2027',
    status: 'active'
  },
  { 
    id: 4, 
    department: 'Emergency', 
    name: 'Pediatric Advanced Life Support (PALS)', 
    type: 'Mandatory', 
    dateEarned: 'Aug 5, 2023',
    validUntil: 'Feb 5, 2025',
    status: 'expiring'
  },
  { 
    id: 5, 
    department: 'General', 
    name: 'Infection Control Certification', 
    type: 'Mandatory', 
    dateEarned: 'Nov 12, 2023',
    validUntil: 'Nov 12, 2024',
    status: 'expired'
  },
  { 
    id: 6, 
    department: 'Oncology', 
    name: 'Chemotherapy Administration', 
    type: 'Optional', 
    dateEarned: 'Sep 30, 2024',
    validUntil: 'Sep 30, 2027',
    status: 'active'
  },
];

const upcomingCertifications = [
  { 
    id: 1, 
    name: 'Wound Care Certification', 
    type: 'Optional', 
    department: 'General',
    dueDate: 'Feb 15, 2025',
    modules: 3,
    status: 'in-progress'
  },
  { 
    id: 2, 
    name: 'Medication Safety Refresher', 
    type: 'Mandatory', 
    department: 'General',
    dueDate: 'Mar 1, 2025',
    modules: 2,
    status: 'not-started'
  },
  { 
    id: 3, 
    name: 'PALS Renewal', 
    type: 'Mandatory', 
    department: 'Emergency',
    dueDate: 'Feb 5, 2025',
    modules: 4,
    status: 'in-progress'
  },
];

const stats = [
  { label: 'Active Certificates', value: 6, icon: Award, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Expiring Soon', value: 2, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'Expired', value: 1, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  { label: 'In Progress', value: 2, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
];

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

export default function NurseCertifications() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certifications & Compliance</h1>
            <p className="text-muted-foreground mt-1">
              Manage your professional certifications and renewals
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email All
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download All
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

        {/* Tabs */}
        <Tabs defaultValue="certificates" className="w-full">
          <TabsList>
            <TabsTrigger value="certificates">My Certificates</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Certifications</TabsTrigger>
          </TabsList>

          <TabsContent value="certificates" className="mt-4">
            <div className="healthcare-card overflow-x-auto">
              <table className="table-healthcare">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Certification Name</th>
                    <th>Type</th>
                    <th>Date Earned</th>
                    <th>Valid Until</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myCertificates.map((cert) => (
                    <tr key={cert.id}>
                      <td>{cert.department}</td>
                      <td className="font-medium text-foreground">{cert.name}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          cert.type === 'Mandatory' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {cert.type}
                        </span>
                      </td>
                      <td>{cert.dateEarned}</td>
                      <td>{cert.validUntil}</td>
                      <td>{getStatusBadge(cert.status)}</td>
                      <td className="text-right">
                        <Button size="sm" variant="outline">
                          <Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingCertifications.map((cert) => (
                <div key={cert.id} className="healthcare-card">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      cert.type === 'Mandatory' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {cert.type}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      cert.status === 'in-progress' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                    }`}>
                      {cert.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{cert.name}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground mb-4">
                    <p>Department: {cert.department}</p>
                    <p>Due Date: {cert.dueDate}</p>
                    <p>Modules Required: {cert.modules}</p>
                  </div>
                  <Button className="w-full" variant={cert.status === 'in-progress' ? 'default' : 'outline'}>
                    {cert.status === 'in-progress' ? 'Continue' : 'Start'}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
