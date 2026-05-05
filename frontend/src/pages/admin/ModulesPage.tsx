import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AdminModuleCard from '@/components/admin/AdminModuleCard';

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

type Question = {
  _id: string;
  question: string;
  type: 'mcq' | 'true-false';
  options: string[];
  correctAnswer: string;
  order: number;
  createdAt: string;
};

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

export default function ModulesPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleContentById, setModuleContentById] = useState<
    Record<string, { lessons: Lesson[]; sops: Sop[]; questions: Question[] }>
  >({});

  // Load course
  useEffect(() => {
    if (!courseId) {
      navigate('/course-library');
      return;
    }

    const loadCourse = async () => {
      setIsLoadingCourse(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load course');
        const data = (await res.json()) as Course;
        setCourse(data);
      } catch (err) {
        console.error(err);
        navigate('/course-library');
      } finally {
        setIsLoadingCourse(false);
      }
    };

    void loadCourse();
  }, [courseId, authHeaders, navigate]);

  // Load modules
  useEffect(() => {
    if (!courseId) return;

    const loadModules = async () => {
      setIsLoadingModules(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/courses/${courseId}/modules`,
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error('Failed to load modules');
        const data = (await res.json()) as CourseModule[];
        setModules(data.sort((a, b) => a.order - b.order));
      } finally {
        setIsLoadingModules(false);
      }
    };

    void loadModules();
  }, [courseId, authHeaders]);

  const loadModuleContent = async (moduleId: string) => {
    try {
      const [lessonsRes, sopsRes, questionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/modules/${moduleId}/lessons`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/modules/${moduleId}/sops`, {
          headers: authHeaders(),
        }),
        fetch(`${API_BASE_URL}/api/modules/${moduleId}/questions`, {
          headers: authHeaders(),
        }),
      ]);
      if (!lessonsRes.ok || !sopsRes.ok || !questionsRes.ok) {
        throw new Error('Failed to load module content');
      }

      const lessons = (await lessonsRes.json()) as Lesson[];
      const sops = (await sopsRes.json()) as Sop[];
      const questions = (await questionsRes.json()) as Question[];
      setModuleContentById((prev) => ({
        ...prev,
        [moduleId]: { lessons, sops, questions },
      }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (modules.length === 0) {
      setModuleContentById({});
      return;
    }
    void Promise.all(modules.map((m) => loadModuleContent(m._id)));
  }, [modules]);

  const saveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError('');
    const title = moduleTitle.trim();

    if (!title) {
      setModuleError('Module title is required.');
      return;
    }

    setModuleSaving(true);
    try {
      const url = editingModule
        ? `${API_BASE_URL}/api/modules/${editingModule._id}`
        : `${API_BASE_URL}/api/courses/${courseId}/modules`;

      const res = await fetch(url, {
        method: editingModule ? 'PUT' : 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save module');

      if (editingModule) {
        setModules((prev) =>
          prev.map((m) => (m._id === editingModule._id ? (data as CourseModule) : m))
        );
        void loadModuleContent(editingModule._id);
      } else {
        setModules((prev) =>
          [...prev, data as CourseModule].sort((a, b) => a.order - b.order)
        );
      }

      setIsModuleDialogOpen(false);
      setModuleTitle('');
      setModuleError('');
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
      setModuleContentById((prev) => {
        const next = { ...prev };
        delete next[m._id];
        return next;
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to delete module.');
    }
  };

  const createModule = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleError('');
    setIsModuleDialogOpen(true);
  };

  const editModule = (m: CourseModule) => {
    setEditingModule(m);
    setModuleTitle(m.title);
    setModuleError('');
    setIsModuleDialogOpen(true);
  };

  if (!courseId) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/course-library')}
            className="h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Module Management</h1>
            {course && (
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            )}
          </div>
          <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={createModule}>
                <Plus className="w-4 h-4 mr-1" />
                Add Module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingModule ? 'Edit Module' : 'Create Module'}
                </DialogTitle>
                <DialogDescription>
                  {editingModule
                    ? 'Update the module details'
                    : 'Add a new module to this course'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveModule} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="module-title">Module Title</Label>
                  <Input
                    id="module-title"
                    placeholder="e.g., Introduction to Patient Care"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    required
                  />
                </div>

                {moduleError && (
                  <p className="text-sm text-destructive">{moduleError}</p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModuleDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={moduleSaving}>
                    {moduleSaving
                      ? 'Saving...'
                      : editingModule
                        ? 'Save Changes'
                        : 'Create Module'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingCourse ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading course...
          </div>
        ) : (
          <>
            {isLoadingModules ? (
              <div className="healthcare-card text-sm text-muted-foreground">
                Loading modules...
              </div>
            ) : modules.length === 0 ? (
              <div className="healthcare-card text-sm text-muted-foreground">
                No modules yet. Add your first module to start uploading lessons, SOPs, and assignments.
              </div>
            ) : (
              <div className="space-y-6">
                {modules.map((m) => {
                  const content = moduleContentById[m._id] || {
                    lessons: [],
                    sops: [],
                    questions: [],
                  };
                  const hasContent =
                    content.lessons.length > 0 ||
                    content.sops.length > 0 ||
                    content.questions.length > 0;
                  return (
                    <div
                      key={m._id}
                      className={`rounded-xl border ${
                        hasContent ? 'border-primary/40 bg-primary/5' : 'border-border'
                      } p-4 space-y-4`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-muted-foreground">
                            Module {m.order}
                          </p>
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {m.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {content.lessons.length} Lessons, {content.sops.length} SOPs,{' '}
                            {content.questions.length} Questions
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasContent && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Has Content
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editModule(m)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteModule(m)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <AdminModuleCard
                        module={m}
                        lessons={content.lessons}
                        sops={content.sops}
                        questions={content.questions}
                        onUploadSuccess={() => {
                          void loadModuleContent(m._id);
                        }}
                        onQuestionsChange={() => {
                          void loadModuleContent(m._id);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
