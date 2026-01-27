import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Library, 
  Plus, 
  Search,
  FolderOpen,
  BookOpen,
  FileQuestion,
  Users,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const departments = [
  { id: 1, name: 'Intensive Care Unit (ICU)', head: 'Dr. Michael Chen', modules: 24, nurses: 156, description: 'Critical care and life support training modules' },
  { id: 2, name: 'Emergency Department', head: 'Dr. Emily Rodriguez', modules: 18, nurses: 89, description: 'Emergency response and trauma care training' },
  { id: 3, name: 'Pediatrics', head: 'Dr. Lisa Thompson', modules: 15, nurses: 67, description: 'Child healthcare and pediatric nursing modules' },
  { id: 4, name: 'Surgery', head: 'Dr. James Peterson', modules: 20, nurses: 112, description: 'Pre and post-operative care training' },
  { id: 5, name: 'Oncology', head: 'Dr. Amanda Foster', modules: 12, nurses: 45, description: 'Cancer care and chemotherapy administration' },
  { id: 6, name: 'Cardiology', head: 'Dr. Robert Garcia', modules: 16, nurses: 78, description: 'Cardiovascular care and monitoring' },
];

const modules = [
  { id: 1, title: 'Ventilator Management', department: 'ICU', author: 'Dr. Sarah Mitchell', status: 'published', enrolled: 234 },
  { id: 2, title: 'IV Medication Safety', department: 'General', author: 'Prof. James Wilson', status: 'published', enrolled: 456 },
  { id: 3, title: 'CPR & ACLS Certification', department: 'Emergency', author: 'Dr. Emily Chen', status: 'published', enrolled: 789 },
  { id: 4, title: 'Sepsis Recognition', department: 'ICU', author: 'Dr. Michael Brown', status: 'draft', enrolled: 0 },
  { id: 5, title: 'Pediatric Emergency Response', department: 'Pediatrics', author: 'Dr. Robert Garcia', status: 'published', enrolled: 345 },
  { id: 6, title: 'Infection Control 2025', department: 'General', author: 'Dr. Amanda Foster', status: 'published', enrolled: 567 },
];

const questionBank = [
  { id: 1, question: 'What is the first step in CPR?', module: 'CPR & ACLS', type: 'Multiple Choice', difficulty: 'Easy' },
  { id: 2, question: 'Calculate the IV drip rate for...', module: 'IV Medication Safety', type: 'Calculation', difficulty: 'Medium' },
  { id: 3, question: 'Identify the signs of sepsis...', module: 'Sepsis Recognition', type: 'Multiple Choice', difficulty: 'Hard' },
  { id: 4, question: 'Ventilator settings for ARDS...', module: 'Ventilator Management', type: 'Multiple Choice', difficulty: 'Hard' },
  { id: 5, question: 'Proper hand hygiene technique...', module: 'Infection Control', type: 'True/False', difficulty: 'Easy' },
];

const stats = [
  { label: 'Departments', value: 12, icon: FolderOpen, color: 'text-primary' },
  { label: 'Total Modules', value: 156, icon: BookOpen, color: 'text-success' },
  { label: 'Question Bank', value: 2450, icon: FileQuestion, color: 'text-warning' },
  { label: 'Active Nurses', value: 1247, icon: Users, color: 'text-info' },
];

export default function CourseLibrary() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Course Library Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage departments, modules, and question banks
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

        {/* Tabs */}
        <Tabs defaultValue="departments" className="w-full">
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search departments..." className="pl-9" />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Department</DialogTitle>
                    <DialogDescription>
                      Add a new department to organize training modules
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input id="dept-name" placeholder="e.g., Intensive Care Unit" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept-head">Department Head</Label>
                      <Input id="dept-head" placeholder="e.g., Dr. Michael Chen" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dept-desc">Description</Label>
                      <Textarea id="dept-desc" placeholder="Brief description of the department..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Create Department</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div key={dept.id} className="healthcare-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem><BookOpen className="w-4 h-4 mr-2" /> View Modules</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{dept.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{dept.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Head: {dept.head}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-sm">
                    <span className="text-muted-foreground">{dept.modules} Modules</span>
                    <span className="text-muted-foreground">{dept.nurses} Nurses</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search modules..." className="pl-9" />
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Module
              </Button>
            </div>

            <div className="healthcare-card overflow-x-auto">
              <table className="table-healthcare">
                <thead>
                  <tr>
                    <th>Module Title</th>
                    <th>Department</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Enrolled</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.id}>
                      <td className="font-medium text-foreground">{module.title}</td>
                      <td>{module.department}</td>
                      <td>{module.author}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          module.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {module.status.charAt(0).toUpperCase() + module.status.slice(1)}
                        </span>
                      </td>
                      <td>{module.enrolled}</td>
                      <td className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Module</DropdownMenuItem>
                            <DropdownMenuItem>Manage Questions</DropdownMenuItem>
                            <DropdownMenuItem>Assign to Department</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Question Bank Tab */}
          <TabsContent value="questions" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search questions..." className="pl-9" />
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            <div className="healthcare-card overflow-x-auto">
              <table className="table-healthcare">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Module</th>
                    <th>Type</th>
                    <th>Difficulty</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questionBank.map((q) => (
                    <tr key={q.id}>
                      <td className="font-medium text-foreground max-w-xs truncate">{q.question}</td>
                      <td>{q.module}</td>
                      <td>{q.type}</td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          q.difficulty === 'Easy' ? 'bg-success/10 text-success' :
                          q.difficulty === 'Medium' ? 'bg-warning/10 text-warning' :
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
