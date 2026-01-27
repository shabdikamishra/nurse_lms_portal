import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  Upload,
  Download,
  MoreHorizontal,
  Edit,
  UserX,
  BookOpen,
  Mail
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const users = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.j@hospital.com', department: 'ICU', role: 'Registered Nurse', manager: 'Dr. Michael Chen', status: 'active', completedModules: 18, totalModules: 20 },
  { id: '2', name: 'James Wilson', email: 'james.w@hospital.com', department: 'Emergency', role: 'Nurse Practitioner', manager: 'Dr. Emily Rodriguez', status: 'active', completedModules: 15, totalModules: 18 },
  { id: '3', name: 'Maria Garcia', email: 'maria.g@hospital.com', department: 'Pediatrics', role: 'Registered Nurse', manager: 'Dr. Lisa Thompson', status: 'active', completedModules: 12, totalModules: 15 },
  { id: '4', name: 'Robert Brown', email: 'robert.b@hospital.com', department: 'Surgery', role: 'Clinical Nurse', manager: 'Dr. James Peterson', status: 'deactivated', completedModules: 8, totalModules: 20 },
  { id: '5', name: 'Jennifer Davis', email: 'jennifer.d@hospital.com', department: 'Oncology', role: 'Registered Nurse', manager: 'Dr. Amanda Foster', status: 'active', completedModules: 14, totalModules: 16 },
  { id: '6', name: 'Michael Lee', email: 'michael.l@hospital.com', department: 'Cardiology', role: 'Nurse Practitioner', manager: 'Dr. Robert Garcia', status: 'archived', completedModules: 20, totalModules: 20 },
  { id: '7', name: 'Emily Chen', email: 'emily.c@hospital.com', department: 'ICU', role: 'Clinical Nurse', manager: 'Dr. Michael Chen', status: 'active', completedModules: 16, totalModules: 20 },
  { id: '8', name: 'David Martinez', email: 'david.m@hospital.com', department: 'Emergency', role: 'Registered Nurse', manager: 'Dr. Emily Rodriguez', status: 'active', completedModules: 10, totalModules: 18 },
];

const stats = [
  { label: 'Total Users', value: 1247, color: 'text-primary' },
  { label: 'Active', value: 1198, color: 'text-success' },
  { label: 'Deactivated', value: 34, color: 'text-warning' },
  { label: 'Archived', value: 15, color: 'text-muted-foreground' },
];

const statusStyles: Record<string, string> = {
  active: 'badge-success',
  deactivated: 'badge-warning',
  archived: 'badge-neutral',
};

export default function UserManagement() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage nursing staff accounts and access
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="healthcare-card">
              <div className="flex items-center gap-3">
                <Users className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="healthcare-card">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or department..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="icu">ICU</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="pediatrics">Pediatrics</SelectItem>
                <SelectItem value="surgery">Surgery</SelectItem>
                <SelectItem value="oncology">Oncology</SelectItem>
                <SelectItem value="cardiology">Cardiology</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="rn">Registered Nurse</SelectItem>
                <SelectItem value="np">Nurse Practitioner</SelectItem>
                <SelectItem value="cn">Clinical Nurse</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="healthcare-card overflow-x-auto">
          <table className="table-healthcare">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Manager</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-foreground">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department}</td>
                  <td>{user.role}</td>
                  <td>{user.manager}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(user.completedModules / user.totalModules) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {user.completedModules}/{user.totalModules}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={statusStyles[user.status]}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Assign Modules
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing 1-8 of 1,247 users
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
