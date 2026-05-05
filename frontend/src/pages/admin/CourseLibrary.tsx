import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Trash2,
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
import { useAuth } from '@/contexts/AuthContext';

type Department = {
  _id: string;
  name: string;
};

type Course = {
  _id: string;
  departmentId: string;
  title: string;
  description?: string;
};

type CourseModule = {
  _id: string;
  courseId: string;
  title: string;
  order: number;
};

const questionBank: any[] = [];

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export default function CourseLibrary() {
  const navigate = useNavigate();
  const { authHeaders, user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');

  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseDepartmentId, setCourseDepartmentId] = useState('');
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseError, setCourseError] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleTargetRole, setModuleTargetRole] = useState('');
  const [moduleEstimatedDuration, setModuleEstimatedDuration] = useState('');
  const [moduleLearningObjectives, setModuleLearningObjectives] = useState('');
  const [moduleMode, setModuleMode] = useState('');
  const [moduleLanguage, setModuleLanguage] = useState('');
  const [moduleCertification, setModuleCertification] = useState('');
  const [moduleContentFile, setModuleContentFile] = useState<File | null>(null);

  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const selectedModule = useMemo(
    () => modules.find((m) => m._id === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  type Lesson = {
    _id: string;
    moduleId: string;
    title: string;
    type: 'pdf' | 'video';
    mimeType: string;
    size: number;
    createdAt: string;
    fileUrl: string;
  };

  type Sop = {
    _id: string;
    moduleId: string;
    title: string;
    mimeType: string;
    size: number;
    createdAt: string;
    fileUrl: string;
  };

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sops, setSops] = useState<Sop[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [sopTitle, setSopTitle] = useState('');
  const [sopFile, setSopFile] = useState<File | null>(null);
  const [contentError, setContentError] = useState('');
  const [contentSuccess, setContentSuccess] = useState('');
  const [isUploadingLesson, setIsUploadingLesson] = useState(false);
  const [isUploadingSop, setIsUploadingSop] = useState(false);
  const [libraryStats, setLibraryStats] = useState({
    departments: 0,
    totalModules: 0,
    questionBank: 0,
    activeNurses: 0,
  });

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, deptSearch]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    const base = selectedDepartmentId
      ? courses.filter((c) => c.departmentId === selectedDepartmentId)
      : courses;
    if (!q) return base;
    return base.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, courseSearch, selectedDepartmentId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const loadDepartments = async () => {
    setIsLoadingDepartments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load departments');
      const data = (await res.json()) as Department[];
      setDepartments(data);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const loadCourseLibraryStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/course-library-stats`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setLibraryStats({
        departments: Number(data?.departments || 0),
        totalModules: Number(data?.totalModules || 0),
        questionBank: Number(data?.questionBank || 0),
        activeNurses: Number(data?.activeNurses || 0),
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadDepartments();
    void loadCourseLibraryStats();
  }, []);

  const loadCourses = async (departmentId?: string) => {
    setIsLoadingCourses(true);
    try {
      const url = new URL('/api/courses', API_BASE_URL);
      if (departmentId) {
        url.searchParams.set('departmentId', departmentId);
      }
      const res = await fetch(url.toString(), { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = (await res.json()) as Course[];
      setCourses(data);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadModules = async (courseId: string) => {
    setIsLoadingModules(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/modules`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load modules');
      const data = (await res.json()) as CourseModule[];
      setModules(data);
    } finally {
      setIsLoadingModules(false);
    }
  };

  useEffect(() => {
    void loadCourses(selectedDepartmentId || undefined);
  }, [selectedDepartmentId]);

  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId('');
      return;
    }
    void loadModules(selectedCourseId);
  }, [selectedCourseId]);

  const loadModuleContent = async (moduleId: string) => {
    setIsLoadingContent(true);
    setContentError('');
    try {
      const [lessonsRes, sopsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/modules/${moduleId}/lessons`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/modules/${moduleId}/sops`, {
          headers: authHeaders(),
        }),
      ]);
      if (!lessonsRes.ok) throw new Error('Failed to load lessons');
      if (!sopsRes.ok) throw new Error('Failed to load SOPs');
      const lessonsData = (await lessonsRes.json()) as Lesson[];
      const sopsData = (await sopsRes.json()) as Sop[];
      setLessons(lessonsData);
      setSops(sopsData);
    } catch (err: any) {
      setContentError(err?.message || 'Failed to load module content.');
      setLessons([]);
      setSops([]);
    } finally {
      setIsLoadingContent(false);
    }
  };

  useEffect(() => {
    if (!selectedModuleId) {
      setLessons([]);
      setSops([]);
      return;
    }
    void loadModuleContent(selectedModuleId);
  }, [selectedModuleId]);

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptError('');
    setIsDeptDialogOpen(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptError('');
    setIsDeptDialogOpen(true);
  };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError('');
    const name = deptName.trim();
    if (!name) {
      setDeptError('Department name is required.');
      return;
    }

    setDeptSaving(true);
    try {
      const url = editingDept
        ? `${API_BASE_URL}/api/departments/${editingDept._id}`
        : `${API_BASE_URL}/api/departments`;

      const res = await fetch(url, {
        method: editingDept ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save department');

      if (editingDept) {
        setDepartments((prev) =>
          prev.map((d) => (d._id === editingDept._id ? (data as Department) : d))
        );
      } else {
        setDepartments((prev) => [data as Department, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      }
      void loadCourseLibraryStats();

      setIsDeptDialogOpen(false);
      setDeptName('');
      setDeptError('');
    } catch (err: any) {
      setDeptError(err?.message || 'Failed to save department.');
    } finally {
      setDeptSaving(false);
    }
  };

  const deleteDept = async (dept: Department) => {
    const ok = window.confirm(`Delete department "${dept.name}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/departments/${dept._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete department');
      setDepartments((prev) => prev.filter((d) => d._id !== dept._id));
      void loadCourseLibraryStats();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete department.');
    }
  };

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseTitle('');
    setCourseDescription('');
    setCourseDepartmentId(selectedDepartmentId || '');
    setCourseError('');
    setIsCourseDialogOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCourseDescription(course.description || '');
    setCourseDepartmentId(course.departmentId);
    setCourseError('');
    setIsCourseDialogOpen(true);
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseError('');
    const title = courseTitle.trim();
    if (!courseDepartmentId) {
      setCourseError('Please choose a department.');
      return;
    }
    if (!title) {
      setCourseError('Course title is required.');
      return;
    }

    setCourseSaving(true);
    try {
      const url = editingCourse
        ? `${API_BASE_URL}/api/courses/${editingCourse._id}`
        : `${API_BASE_URL}/api/courses`;
      const res = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: courseDepartmentId,
          title,
          description: courseDescription.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save course');

      if (editingCourse) {
        setCourses((prev) => prev.map((c) => (c._id === editingCourse._id ? (data as Course) : c)));
      } else {
        setCourses((prev) => [data as Course, ...prev]);
      }
      void loadCourseLibraryStats();
      setIsCourseDialogOpen(false);
    } catch (err: any) {
      setCourseError(err?.message || 'Failed to save course.');
    } finally {
      setCourseSaving(false);
    }
  };

  const deleteCourse = async (course: Course) => {
    const ok = window.confirm(`Delete course "${course.title}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${course._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete course');
      setCourses((prev) => prev.filter((c) => c._id !== course._id));
      void loadCourseLibraryStats();
      if (selectedCourseId === course._id) {
        setSelectedCourseId('');
        setModules([]);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete course.');
    }
  };

  const openCreateModule = () => {
    if (!selectedCourseId) return;
    setEditingModule(null);
    setModuleTitle('');
    setModuleTargetRole('');
    setModuleEstimatedDuration('');
    setModuleLearningObjectives('');
    setModuleMode('');
    setModuleLanguage('');
    setModuleCertification('');
    setModuleContentFile(null);
    setModuleError('');
    setIsModuleDialogOpen(true);
  };

  const openEditModule = (m: CourseModule) => {
    setEditingModule(m);
    setModuleTitle(m.title);
    setModuleTargetRole('');
    setModuleEstimatedDuration('');
    setModuleLearningObjectives('');
    setModuleMode('');
    setModuleLanguage('');
    setModuleCertification('');
    setModuleContentFile(null);
    setModuleError('');
    setIsModuleDialogOpen(true);
  };

  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError('');
    const title = moduleTitle.trim();
    if (!selectedCourseId) {
      setModuleError('Please select a course first.');
      return;
    }
    if (!title) {
      setModuleError('Module title is required.');
      return;
    }

    setModuleSaving(true);
    try {
      const url = editingModule
        ? `${API_BASE_URL}/api/modules/${editingModule._id}`
        : `${API_BASE_URL}/api/courses/${selectedCourseId}/modules`;
      const formData = new FormData();
      formData.append('title', title);
      formData.append('targetRole', moduleTargetRole.trim());
      formData.append('estimatedDuration', moduleEstimatedDuration.trim());
      formData.append('learningObjectives', moduleLearningObjectives.trim());
      formData.append('mode', moduleMode.trim());
      formData.append('language', moduleLanguage.trim());
      formData.append('certification', moduleCertification.trim());
      if (moduleContentFile) {
        formData.append('contentFile', moduleContentFile);
      }
      const res = await fetch(url, {
        method: editingModule ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save module');

      if (editingModule) {
        setModules((prev) => prev.map((m) => (m._id === editingModule._id ? (data as CourseModule) : m)));
      } else {
        setModules((prev) => [...prev, data as CourseModule].sort((a, b) => a.order - b.order));
      }
      void loadCourseLibraryStats();
      setIsModuleDialogOpen(false);
    } catch (err: any) {
      setModuleError(err?.message || 'Failed to save module.');
    } finally {
      setModuleSaving(false);
    }
  };

  const deleteModule = async (m: CourseModule) => {
    const ok = window.confirm(`Delete module "${m.title}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/modules/${m._id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete module');
      setModules((prev) => prev.filter((x) => x._id !== m._id));
      void loadCourseLibraryStats();
      if (selectedModuleId === m._id) {
        setSelectedModuleId('');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete module.');
    }
  };

  const reorderModules = async (next: CourseModule[]) => {
    if (!selectedCourseId) return;
    setModules(next);
    try {
      await fetch(`${API_BASE_URL}/api/courses/${selectedCourseId}/modules/reorder`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedModuleIds: next.map((m) => m._id) }),
      });
      // reload to sync order numbers
      await loadModules(selectedCourseId);
    } catch {
      // best-effort; leave UI order as-is
    }
  };

  const uploadLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setContentError('');
    setContentSuccess('');
    if (!selectedModuleId) {
      setContentError('Select a module first.');
      return;
    }
    if (!lessonTitle.trim() || !lessonFile) {
      setContentError('Lesson title and file are required.');
      return;
    }
    setIsUploadingLesson(true);
    try {
      const fd = new FormData();
      fd.append('title', lessonTitle.trim());
      fd.append('file', lessonFile);
      const res = await fetch(`${API_BASE_URL}/api/modules/${selectedModuleId}/lessons`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload lesson');
      setContentSuccess('Lesson uploaded.');
      setLessonTitle('');
      setLessonFile(null);
      await loadModuleContent(selectedModuleId);
    } catch (err: any) {
      setContentError(err?.message || 'Failed to upload lesson.');
    } finally {
      setIsUploadingLesson(false);
    }
  };

  const uploadSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setContentError('');
    setContentSuccess('');
    if (!selectedModuleId) {
      setContentError('Select a module first.');
      return;
    }
    if (!sopTitle.trim() || !sopFile) {
      setContentError('SOP title and PDF file are required.');
      return;
    }
    setIsUploadingSop(true);
    try {
      const fd = new FormData();
      fd.append('title', sopTitle.trim());
      fd.append('file', sopFile);
      const res = await fetch(`${API_BASE_URL}/api/modules/${selectedModuleId}/sops`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload SOP');
      setContentSuccess('SOP uploaded.');
      setSopTitle('');
      setSopFile(null);
      await loadModuleContent(selectedModuleId);
    } catch (err: any) {
      setContentError(err?.message || 'Failed to upload SOP.');
    } finally {
      setIsUploadingSop(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/lessons/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete lesson');
      if (selectedModuleId) await loadModuleContent(selectedModuleId);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete lesson.');
    }
  };

  const deleteSop = async (id: string) => {
    if (!confirm('Delete this SOP?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/sops/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete SOP');
      if (selectedModuleId) await loadModuleContent(selectedModuleId);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete SOP.');
    }
  };

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
          {[
            { label: 'Departments', value: libraryStats.departments, icon: FolderOpen, color: 'text-primary' },
            { label: 'Total Modules', value: libraryStats.totalModules, icon: BookOpen, color: 'text-success' },
            { label: 'Question Bank', value: libraryStats.questionBank, icon: FileQuestion, color: 'text-warning' },
            { label: 'Active Nurses', value: libraryStats.activeNurses, icon: Users, color: 'text-info' },
          ].map((stat) => (
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
                <Input
                  placeholder="Search departments..."
                  className="pl-9"
                  value={deptSearch}
                  onChange={(e) => setDeptSearch(e.target.value)}
                />
              </div>
              <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDept}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDept ? 'Edit Department' : 'Create New Department'}
                    </DialogTitle>
                    <DialogDescription>
                      Add a new department to organize training modules
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={saveDept} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input
                        id="dept-name"
                        placeholder="e.g., Intensive Care Unit"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        required
                      />
                    </div>

                    {deptError && (
                      <p className="text-sm text-destructive">{deptError}</p>
                    )}

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDeptDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={deptSaving}>
                        {deptSaving
                          ? 'Saving...'
                          : editingDept
                            ? 'Save Changes'
                            : 'Create Department'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoadingDepartments ? (
                <div className="text-sm text-muted-foreground">Loading departments...</div>
              ) : filteredDepartments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No departments found.</div>
              ) : (
                filteredDepartments.map((dept) => (
                <div key={dept._id} className="healthcare-card">
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
                        <DropdownMenuItem onClick={() => openEditDept(dept)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BookOpen className="w-4 h-4 mr-2" /> View Courses
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteDept(dept)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{dept.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Department
                  </p>
                </div>
              ))
              )}
            </div>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Courses */}
              <div className="healthcare-card">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        className="pl-9"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Label className="text-sm text-muted-foreground">Filter by Department</Label>
                      <select
                        className="border border-border rounded-md bg-background text-foreground px-2 py-1 text-sm"
                        value={selectedDepartmentId}
                        onChange={(e) => {
                          setSelectedDepartmentId(e.target.value);
                          setSelectedCourseId('');
                        }}
                      >
                        <option value="">All</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCreateCourse}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCourse ? 'Edit Course' : 'Create Course'}
                        </DialogTitle>
                        <DialogDescription>
                          Courses belong to a department and contain modules.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={saveCourse} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <select
                            className="w-full border border-border rounded-md bg-background text-foreground px-3 py-2"
                            value={courseDepartmentId}
                            onChange={(e) => setCourseDepartmentId(e.target.value)}
                            required
                          >
                            <option value="" disabled>
                              Select department
                            </option>
                            {departments.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-title">Course Title</Label>
                          <Input
                            id="course-title"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="course-desc">Description</Label>
                          <Textarea
                            id="course-desc"
                            value={courseDescription}
                            onChange={(e) => setCourseDescription(e.target.value)}
                            placeholder="Optional description"
                          />
                        </div>

                        {courseError && (
                          <p className="text-sm text-destructive">{courseError}</p>
                        )}

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={courseSaving}>
                            {courseSaving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {isLoadingCourses ? (
                  <p className="text-sm text-muted-foreground">Loading courses...</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No courses yet.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredCourses.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => navigate(`/modules-page?courseId=${c._id}`)}
                        className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                          selectedCourseId === c._id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {departments.find((d) => d._id === c.departmentId)?.name || 'Unknown department'}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditCourse(c)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/modules-page?courseId=${c._id}`)}>
                                <BookOpen className="w-4 h-4 mr-2" /> Manage Modules
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteCourse(c)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Modules for selected course */}
              <div className="healthcare-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Modules</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCourse ? `Course: ${selectedCourse.title}` : 'Select a course to manage modules'}
                    </p>
                  </div>
                  <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCreateModule} disabled={!selectedCourseId}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Module
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingModule ? 'Edit Module' : 'Create Module'}
                        </DialogTitle>
                        <DialogDescription>
                          Modules belong to a course and can be reordered.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={saveModule} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="module-title">Module Title</Label>
                          <Input
                            id="module-title"
                            value={moduleTitle}
                            onChange={(e) => setModuleTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="module-role">Target Role</Label>
                            <Input
                              id="module-role"
                              value={moduleTargetRole}
                              onChange={(e) => setModuleTargetRole(e.target.value)}
                              placeholder="e.g., Staff Nurse"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="module-duration">Estimated Duration</Label>
                            <Input
                              id="module-duration"
                              value={moduleEstimatedDuration}
                              onChange={(e) => setModuleEstimatedDuration(e.target.value)}
                              placeholder="e.g., 45 mins"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="module-objectives">Learning Objectives</Label>
                            <Input
                              id="module-objectives"
                              value={moduleLearningObjectives}
                              onChange={(e) => setModuleLearningObjectives(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="module-mode">Mode</Label>
                            <Input
                              id="module-mode"
                              value={moduleMode}
                              onChange={(e) => setModuleMode(e.target.value)}
                              placeholder="Online / Blended"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="module-language">Language</Label>
                            <Input
                              id="module-language"
                              value={moduleLanguage}
                              onChange={(e) => setModuleLanguage(e.target.value)}
                              placeholder="English"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="module-certification">Certification</Label>
                            <Input
                              id="module-certification"
                              value={moduleCertification}
                              onChange={(e) => setModuleCertification(e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="module-content-file">
                            Upload Course Content (PDF, Video, SCORM, Text, MP4)
                          </Label>
                          <Input
                            id="module-content-file"
                            type="file"
                            accept=".pdf,.txt,.zip,.scorm,video/*"
                            onChange={(e) => setModuleContentFile(e.target.files?.[0] ?? null)}
                          />
                        </div>

                        {moduleError && (
                          <p className="text-sm text-destructive">{moduleError}</p>
                        )}

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={moduleSaving}>
                            {moduleSaving ? 'Saving...' : editingModule ? 'Save Changes' : 'Create Module'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {!selectedCourseId ? (
                  <p className="text-sm text-muted-foreground">Choose a course from the left.</p>
                ) : isLoadingModules ? (
                  <p className="text-sm text-muted-foreground">Loading modules...</p>
                ) : modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules yet.</p>
                ) : (
                  <div className="space-y-2">
                    {modules
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((m, idx, arr) => (
                        <div
                          key={m._id}
                          className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${
                            selectedModuleId === m._id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                          onClick={() => setSelectedModuleId(m._id)}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {m.order}. {m.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModule(m)}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteModule(m)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Use <span className="font-medium text-foreground">Manage Modules</span> on a course to open the dedicated module management page.
                  </p>
                </div>
              </div>
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
