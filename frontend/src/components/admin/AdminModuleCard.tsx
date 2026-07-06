import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  CheckCircle,
  File,
  Film,
  FileText,
  Trash2,
  Eye,
  Plus,
  X,
  Edit,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

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

interface AdminModuleCardProps {
  module: {
    _id: string;
    title: string;
    passingPercentage?: number;
    maxQuizAttempts?: number | null;
  };
  lessons: Lesson[];
  sops: Sop[];
  onUploadSuccess: () => void;
  questions?: Question[];
  onQuestionsChange?: () => void;
}

export default function AdminModuleCard({
  module,
  lessons,
  sops,
  onUploadSuccess,
  questions = [],
  onQuestionsChange,
}: AdminModuleCardProps) {
  const { authHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState<'lessons' | 'sops' | 'questions'>('lessons');

  // Lesson upload state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [isUploadingLesson, setIsUploadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [lessonSuccess, setLessonSuccess] = useState('');

  // SOP upload state
  const [sopTitle, setSopTitle] = useState('');
  const [sopFile, setSopFile] = useState<File | null>(null);
  const [isUploadingSop, setIsUploadingSop] = useState(false);
  const [sopError, setSopError] = useState('');
  const [sopSuccess, setSopSuccess] = useState('');

  // Show upload form state
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showSopForm, setShowSopForm] = useState(false);

  // Question state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionType, setQuestionType] = useState<'mcq' | 'true-false'>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [questionSuccess, setQuestionSuccess] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [passingPercentage, setPassingPercentage] = useState(
    String(module.passingPercentage ?? 70)
  );
  const [attemptLimitType, setAttemptLimitType] = useState<'unlimited' | 'limited'>(
    module.maxQuizAttempts != null ? 'limited' : 'unlimited'
  );
  const [maxAttempts, setMaxAttempts] = useState(
    String(module.maxQuizAttempts ?? 3)
  );
  const [quizSettingsSaving, setQuizSettingsSaving] = useState(false);
  const [quizSettingsMessage, setQuizSettingsMessage] = useState('');

  useEffect(() => {
    setPassingPercentage(String(module.passingPercentage ?? 70));
    setAttemptLimitType(module.maxQuizAttempts != null ? 'limited' : 'unlimited');
    setMaxAttempts(String(module.maxQuizAttempts ?? 3));
  }, [module._id, module.passingPercentage, module.maxQuizAttempts]);

  const saveQuizSettings = async () => {
    setQuizSettingsSaving(true);
    setQuizSettingsMessage('');
    try {
      const pct = Number(passingPercentage);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error('Passing percentage must be between 0 and 100');
      }
      const body: Record<string, unknown> = {
        passingPercentage: pct,
        maxQuizAttempts:
          attemptLimitType === 'limited' ? Number(maxAttempts) : null,
      };
      const res = await fetch(`${API_BASE_URL}/api/modules/${module._id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to save quiz settings');
      setQuizSettingsMessage('Quiz settings saved');
      onQuestionsChange?.();
    } catch (err: unknown) {
      setQuizSettingsMessage(
        err instanceof Error ? err.message : 'Failed to save quiz settings'
      );
    } finally {
      setQuizSettingsSaving(false);
    }
  };

  // Clear success messages after 3 seconds
  useEffect(() => {
    if (lessonSuccess) {
      const timer = setTimeout(() => setLessonSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [lessonSuccess]);

  useEffect(() => {
    if (sopSuccess) {
      const timer = setTimeout(() => setSopSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [sopSuccess]);

  useEffect(() => {
    if (questionSuccess) {
      const timer = setTimeout(() => setQuestionSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [questionSuccess]);

  const uploadLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setLessonError('');
    setLessonSuccess('');

    if (!lessonTitle.trim() || !lessonFile) {
      setLessonError('Title and file are required.');
      return;
    }

    setIsUploadingLesson(true);
    try {
      const fd = new FormData();
      fd.append('title', lessonTitle.trim());
      fd.append('file', lessonFile);

      const res = await fetch(
        `${API_BASE_URL}/api/modules/${module._id}/lessons`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: fd,
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload lesson');

      setLessonSuccess('✓ Lesson uploaded successfully');
      setLessonTitle('');
      setLessonFile(null);
      setShowLessonForm(false);
      onUploadSuccess();
    } catch (err: any) {
      setLessonError(err?.message || 'Failed to upload lesson.');
    } finally {
      setIsUploadingLesson(false);
    }
  };

  const uploadSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSopError('');
    setSopSuccess('');

    if (!sopTitle.trim() || !sopFile) {
      setSopError('Title and file are required.');
      return;
    }

    setIsUploadingSop(true);
    try {
      const fd = new FormData();
      fd.append('title', sopTitle.trim());
      fd.append('file', sopFile);

      const res = await fetch(
        `${API_BASE_URL}/api/modules/${module._id}/sops`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: fd,
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to upload SOP');

      setSopSuccess('✓ SOP uploaded successfully');
      setSopTitle('');
      setSopFile(null);
      setShowSopForm(false);
      onUploadSuccess();
    } catch (err: any) {
      setSopError(err?.message || 'Failed to upload SOP.');
    } finally {
      setIsUploadingSop(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!window.confirm('Delete this lesson?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/lessons/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete lesson');

      onUploadSuccess();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete lesson.');
    }
  };

  const deleteSop = async (id: string) => {
    if (!window.confirm('Delete this SOP?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/sops/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete SOP');

      onUploadSuccess();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete SOP.');
    }
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError('');
    setQuestionSuccess('');

    if (!questionText.trim()) {
      setQuestionError('Question text is required.');
      return;
    }

    if (questionType === 'mcq') {
      const filledOptions = mcqOptions.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        setQuestionError('At least 2 options are required for MCQ.');
        return;
      }
      if (!correctAnswer) {
        setQuestionError('Please select a correct answer.');
        return;
      }
    } else {
      if (!correctAnswer) {
        setQuestionError('Please select the correct answer.');
        return;
      }
    }

    setIsCreatingQuestion(true);
    try {
      const method = editingQuestion ? 'PUT' : 'POST';
      const url = editingQuestion
        ? `${API_BASE_URL}/api/questions/${editingQuestion._id}`
        : `${API_BASE_URL}/api/modules/${module._id}/questions`;

      const payload: any = {
        question: questionText.trim(),
        type: questionType,
        correctAnswer: correctAnswer.trim(),
      };

      if (questionType === 'mcq') {
        payload.options = mcqOptions.filter((opt) => opt.trim());
      } else {
        payload.options = ['True', 'False'];
      }

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save question');

      setQuestionSuccess(
        editingQuestion ? '✓ Question updated successfully' : '✓ Question added successfully'
      );
      setQuestionText('');
      setMcqOptions(['', '', '', '']);
      setCorrectAnswer('');
      setShowQuestionForm(false);
      setEditingQuestion(null);
      onQuestionsChange?.();
    } catch (err: any) {
      setQuestionError(err?.message || 'Failed to save question.');
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete question');

      onQuestionsChange?.();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete question.');
    }
  };

  const startEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question);
    setQuestionType(question.type);
    setCorrectAnswer(question.correctAnswer);
    if (question.type === 'mcq') {
      setMcqOptions(question.options);
    }
    setShowQuestionForm(true);
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionText('');
    setMcqOptions(['', '', '', '']);
    setCorrectAnswer('');
    setQuestionType('mcq');
    setQuestionError('');
    setShowQuestionForm(false);
  };

  const viewFile = (fileUrl: string) => {
    fetch(`${API_BASE_URL}${fileUrl}`, { headers: authHeaders() })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noreferrer');
      })
      .catch(() => alert('Failed to open file'));
  };

  return (
    <div className="healthcare-card space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{module.title}</h2>
        <div className="flex flex-wrap gap-2 mt-2 text-sm">
          <span className="content-tag content-tag-lesson">
            📄 {lessons.filter((l) => l.type === 'pdf').length} PDFs uploaded
          </span>
          <span className="content-tag content-tag-video">
            🎥 {lessons.filter((l) => l.type === 'video').length} Video{lessons.filter((l) => l.type === 'video').length !== 1 ? 's' : ''} added
          </span>
          <span className="content-tag content-tag-sop">
            📘 {sops.length > 0 ? 'SOP available' : 'No SOP yet'}
          </span>
          <span className="content-tag content-tag-quiz">
            📝 {questions.length} Question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'lessons'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lessons
          </button>
          <button
            onClick={() => setActiveTab('sops')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sops'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            SOPs
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Questions
          </button>
        </div>
      </div>

      {/* Lessons Tab */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          {lessonError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{lessonError}</AlertDescription>
            </Alert>
          )}
          {lessonSuccess && (
            <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                {lessonSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Lessons List */}
          {lessons.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Uploaded Lessons</h4>
              <div className="grid gap-2">
                {lessons.map((lesson) => (
                  <div
                    key={lesson._id}
                    className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {lesson.type === 'pdf' ? (
                        <File className="w-5 h-5 text-destructive flex-shrink-0" />
                      ) : (
                        <Film className="w-5 h-5 text-info flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lesson.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lesson.type.toUpperCase()} • {new Date(lesson.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewFile(lesson.fileUrl)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLesson(lesson._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Form */}
          {!showLessonForm ? (
            <Button onClick={() => setShowLessonForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {lessons.length > 0 ? '+ Add More Lessons' : 'Upload Lesson (PDF or Video)'}
            </Button>
          ) : (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-foreground">Upload Lesson</h5>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowLessonForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={uploadLesson} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Title</Label>
                  <Input
                    id="lesson-title"
                    placeholder="e.g., Chapter 1: Introduction"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lesson-file">File (PDF or Video)</Label>
                  <Input
                    id="lesson-file"
                    type="file"
                    accept="application/pdf,video/*"
                    onChange={(e) => setLessonFile(e.target.files?.[0] ?? null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports PDF and video formats. Max 100MB.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isUploadingLesson}
                    className="flex-1"
                  >
                    {isUploadingLesson ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLessonForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SOPs Tab */}
      {activeTab === 'sops' && (
        <div className="space-y-4">
          {sopError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sopError}</AlertDescription>
            </Alert>
          )}
          {sopSuccess && (
            <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                {sopSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* SOPs List */}
          {sops.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Uploaded SOPs</h4>
              <div className="grid gap-2">
                {sops.map((sop) => (
                  <div
                    key={sop._id}
                    className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sop.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF • {new Date(sop.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewFile(sop.fileUrl)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSop(sop._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Form */}
          {!showSopForm ? (
            <Button onClick={() => setShowSopForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {sops.length > 0 ? '+ Add More SOPs' : 'Upload SOP (PDF Only)'}
            </Button>
          ) : (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-foreground">Upload SOP</h5>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSopForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={uploadSop} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sop-title">Title</Label>
                  <Input
                    id="sop-title"
                    placeholder="e.g., Standard Operating Procedure"
                    value={sopTitle}
                    onChange={(e) => setSopTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sop-file">PDF File</Label>
                  <Input
                    id="sop-file"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSopFile(e.target.files?.[0] ?? null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    PDF only. Max 100MB.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isUploadingSop}
                    className="flex-1"
                  >
                    {isUploadingSop ? 'Uploading...' : 'Upload'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSopForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium">Quiz Settings</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Passing marks (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quiz attempts</Label>
                <select
                  className="w-full border border-border rounded-md bg-background px-3 py-2 text-sm"
                  value={attemptLimitType}
                  onChange={(e) =>
                    setAttemptLimitType(e.target.value as 'unlimited' | 'limited')
                  }
                >
                  <option value="unlimited">Unlimited attempts</option>
                  <option value="limited">Limited attempts</option>
                </select>
              </div>
              {attemptLimitType === 'limited' && (
                <div className="space-y-2">
                  <Label>Max attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                  />
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={quizSettingsSaving}
              onClick={() => void saveQuizSettings()}
            >
              {quizSettingsSaving ? 'Saving...' : 'Save Quiz Settings'}
            </Button>
            {quizSettingsMessage && (
              <p className="text-xs text-muted-foreground">{quizSettingsMessage}</p>
            )}
          </div>

          {questionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{questionError}</AlertDescription>
            </Alert>
          )}
          {questionSuccess && (
            <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                {questionSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Questions ({questions.length})</h4>
              <div className="grid gap-2">
                {questions.map((q) => (
                  <div
                    key={q._id}
                    className="border border-border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {q.type === 'mcq' ? 'MCQ' : 'True/False'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, idx) => (
                            <p
                              key={idx}
                              className={`text-xs pl-4 ${
                                opt === q.correctAnswer
                                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {opt === q.correctAnswer ? '✓ ' : '○ '}
                              {opt}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditQuestion(q)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteQuestion(q._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Question Form */}
          {!showQuestionForm ? (
            <Button onClick={() => setShowQuestionForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {questions.length > 0 ? '+ Add More Questions' : 'Add Question'}
            </Button>
          ) : (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-foreground">
                  {editingQuestion ? 'Edit Question' : 'Add Question'}
                </h5>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetQuestionForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={saveQuestion} className="space-y-3">
                {/* Question Type */}
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="mcq"
                        checked={questionType === 'mcq'}
                        onChange={(e) => setQuestionType(e.target.value as 'mcq')}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-foreground">MCQ (4 options)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="true-false"
                        checked={questionType === 'true-false'}
                        onChange={(e) => setQuestionType(e.target.value as 'true-false')}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-foreground">True/False</span>
                    </label>
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-2">
                  <Label htmlFor="question-text">Question</Label>
                  <Input
                    id="question-text"
                    placeholder="Enter your question here..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    required
                  />
                </div>

                {/* Options */}
                {questionType === 'mcq' ? (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {mcqOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={correctAnswer === opt && opt !== ''}
                            onChange={() => setCorrectAnswer(opt)}
                            disabled={!opt}
                            className="cursor-pointer"
                          />
                          <Input
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...mcqOptions];
                              newOptions[idx] = e.target.value;
                              setMcqOptions(newOptions);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fill in at least 2 options and select the correct answer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={correctAnswer === 'True'}
                          onChange={() => setCorrectAnswer('True')}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-foreground">True</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={correctAnswer === 'False'}
                          onChange={() => setCorrectAnswer('False')}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-foreground">False</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isCreatingQuestion}
                    className="flex-1"
                  >
                    {isCreatingQuestion
                      ? 'Saving...'
                      : editingQuestion
                        ? 'Update Question'
                        : 'Add Question'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetQuestionForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
