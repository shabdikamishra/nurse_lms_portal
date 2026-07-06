import { useEffect, useState } from 'react';
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
  Mail,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

const stats = [
  { label: 'Total Users', value: 1247, color: 'text-primary' },
  { label: 'Active', value: 1198, color: 'text-success' },
  { label: 'Deactivated', value: 34, color: 'text-warning' },
  { label: 'Archived', value: 15, color: 'text-muted-foreground' },
];

type AdminUser = {
  _id: string;
  email: string;
  name: string;
  empId: string;
  department: string;
  role: 'nurse' | 'admin' | 'supervisor';
  departmentId?: string;
};

type NurseFile = {
  _id: string;
  nurseEmail: string;
  title: string;
  originalName: string;
  filename: string;
  createdAt: string;
};

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

async function fetchNurseFiles(nurseEmail: string, authHeaders: Record<string, string>): Promise<NurseFile[]> {
  const url = new URL('/api/nurse-files', API_BASE_URL);
  url.searchParams.set('nurseEmail', nurseEmail);
  const res = await fetch(url.toString(), {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error('Failed to load nurse files');
  }
  return res.json();
}

export default function UserManagement() {
  const { user: currentUser, authHeaders } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [files, setFiles] = useState<NurseFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmpId, setNewUserEmpId] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserRole, setNewUserRole] = useState<'nurse' | 'supervisor'>('nurse');
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [newUserDepartmentId, setNewUserDepartmentId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [createdDemoPassword, setCreatedDemoPassword] = useState<string | null>(null);

  const openUploadDialog = (email: string) => {
    setSelectedEmail(email);
    setUploadTitle('');
    setUploadFile(null);
    setUploadError('');
    setFiles([]);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/departments`, {
          headers: authHeaders(),
        });
        if (res.ok) setDepartments(await res.json());
      } catch {
        /* ignore */
      }
    };
    void loadDepts();
  }, [authHeaders]);

  const openAddUserDialog = () => {
    setNewUserEmail('');
    setNewUserName('');
    setNewUserEmpId('');
    setNewUserDepartment('');
    setNewUserDepartmentId('');
    setNewUserRole('nurse');
    setCreateUserError('');
    setCreateUserSuccess('');
    setCreatedDemoPassword(null);
    setIsAddUserOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');
    setCreatedDemoPassword(null);

    if (
      !newUserEmail.trim() ||
      !newUserName.trim() ||
      !newUserEmpId.trim() ||
      !newUserDepartment.trim() ||
      (newUserRole === 'supervisor' && !newUserDepartmentId)
    ) {
      setCreateUserError('Please fill in all required fields.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          name: newUserName.trim(),
          empId: newUserEmpId.trim(),
          department: newUserDepartment.trim(),
          departmentId: newUserRole === 'supervisor' ? newUserDepartmentId : undefined,
          role: newUserRole,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create user');
      }

      setCreateUserSuccess('User created successfully.');
      if (data?.demoPassword) {
        setCreatedDemoPassword(data.demoPassword);
      }
      if (data?.user) {
        setUsers((prev) => [data.user as AdminUser, ...prev]);
      }
    } catch (err: any) {
      setCreateUserError(err?.message || 'Failed to create user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          throw new Error('Failed to load users');
        }
        const data = (await res.json()) as AdminUser[];
        setUsers(data);
      } catch {
        // keep table empty on error for now
      } finally {
        setIsLoadingUsers(false);
      }
    };

    void loadUsers();
  }, [authHeaders]);

  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedEmail) return;
      setIsLoadingFiles(true);
      try {
        const data = await fetchNurseFiles(selectedEmail, authHeaders());
        setFiles(data);
      } catch {
        // ignore for now, error handled in UI when uploading
      } finally {
        setIsLoadingFiles(false);
      }
    };
    if (isDialogOpen && selectedEmail) {
      void loadFiles();
    }
  }, [isDialogOpen, selectedEmail, authHeaders]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !uploadFile || !uploadTitle.trim()) {
      setUploadError('Please provide a title and select a PDF file.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('nurseEmail', selectedEmail);
      formData.append('title', uploadTitle.trim());
      if (currentUser?.email) {
        formData.append('uploadedBy', currentUser.email);
      }
      formData.append('file', uploadFile);

      const res = await fetch(`${API_BASE_URL}/api/nurse-files`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to upload file');
      }

      const created: NurseFile = await res.json();
      setFiles((prev) => [created, ...prev]);
      setUploadTitle('');
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

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
            <Button onClick={openAddUserDialog}>
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
                <th>EmpID</th>
                <th>Department</th>
                <th>Role</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUsers ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">
                    No users found. Use &quot;Add User&quot; to create one.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td className="font-medium text-foreground">{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.empId}</td>
                    <td>{user.department}</td>
                    <td className="capitalize">{user.role}</td>
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
                          <DropdownMenuItem onClick={() => openUploadDialog(user.email)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Nurse Files (PDF)
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Nurse Files (PDF)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedEmail ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., BLS Certificate"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">PDF File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setUploadFile(file);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Only PDF files are allowed.
                </p>
              </div>
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </DialogFooter>
            </form>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Existing Files</h3>
              {isLoadingFiles ? (
                <p className="text-sm text-muted-foreground">Loading files...</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No files uploaded yet.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {files.map((file) => (
                    <div
                      key={file._id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {file.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(file.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                      >
                        <a
                          href={`${API_BASE_URL}/api/nurse-files/${file._id}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="nurse@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Full Name</Label>
                <Input
                  id="new-user-name"
                  placeholder="Enter full name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-empid">EmpID</Label>
                <Input
                  id="new-user-empid"
                  placeholder="Employee ID"
                  value={newUserEmpId}
                  onChange={(e) => setNewUserEmpId(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Role</Label>
                <Select
                  value={newUserRole}
                  onValueChange={(v) => setNewUserRole(v as 'nurse' | 'supervisor')}
                >
                  <SelectTrigger id="new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-department">Department</Label>
                {newUserRole === 'supervisor' && departments.length > 0 ? (
                  <Select
                    value={newUserDepartmentId}
                    onValueChange={(id) => {
                      setNewUserDepartmentId(id);
                      const dept = departments.find((d) => d._id === id);
                      if (dept) setNewUserDepartment(dept.name);
                    }}
                  >
                    <SelectTrigger id="new-user-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="new-user-department"
                    placeholder="e.g., ICU, Emergency"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    required
                  />
                )}
              </div>

              {createUserError && (
                <p className="text-sm text-destructive">{createUserError}</p>
              )}
              {createUserSuccess && (
                <div className="space-y-1 text-sm">
                  <p className="text-emerald-600 dark:text-emerald-400">
                    {createUserSuccess}
                  </p>
                  {createdDemoPassword && (
                    <p className="text-muted-foreground">
                      Demo password for this user:{' '}
                      <span className="font-mono font-semibold">
                        {createdDemoPassword}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Close
                </Button>
                <Button type="submit" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
