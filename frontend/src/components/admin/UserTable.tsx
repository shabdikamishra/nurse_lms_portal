import { MoreHorizontal, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  manager: string;
  status: 'active' | 'deactivated' | 'archived';
}

const mockUsers: User[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.j@hospital.com', department: 'ICU', role: 'Registered Nurse', manager: 'Dr. Michael Chen', status: 'active' },
  { id: '2', name: 'James Wilson', email: 'james.w@hospital.com', department: 'Emergency', role: 'Nurse Practitioner', manager: 'Dr. Emily Rodriguez', status: 'active' },
  { id: '3', name: 'Maria Garcia', email: 'maria.g@hospital.com', department: 'Pediatrics', role: 'Registered Nurse', manager: 'Dr. Lisa Thompson', status: 'active' },
  { id: '4', name: 'Robert Brown', email: 'robert.b@hospital.com', department: 'Surgery', role: 'Clinical Nurse', manager: 'Dr. James Peterson', status: 'deactivated' },
  { id: '5', name: 'Jennifer Davis', email: 'jennifer.d@hospital.com', department: 'Oncology', role: 'Registered Nurse', manager: 'Dr. Amanda Foster', status: 'active' },
  { id: '6', name: 'Michael Lee', email: 'michael.l@hospital.com', department: 'Cardiology', role: 'Nurse Practitioner', manager: 'Dr. Robert Garcia', status: 'archived' },
];

const statusStyles = {
  active: 'badge-success',
  deactivated: 'badge-warning',
  archived: 'badge-neutral',
};

export function UserTable() {
  return (
    <div className="healthcare-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">User Management</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-9" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <Button>Add User</Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-healthcare">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id}>
                <td className="font-medium text-foreground">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td>{user.role}</td>
                <td>{user.manager}</td>
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
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit User</DropdownMenuItem>
                      <DropdownMenuItem>Assign Modules</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing 1-6 of 124 users
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}
