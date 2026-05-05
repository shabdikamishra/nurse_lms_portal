import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

type Question = {
  _id: string;
  question: string;
  type: 'mcq' | 'true-false';
  options: string[];
  order: number;
};

type QuizAttempt = {
  _id: string;
  score: number;
  totalQuestions: number;
  percent: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    correctAnswer: string | null;
  }>;
};

interface QuizState {
  loading: boolean;
  error: string;
  questions: Question[];
  moduleTitle: string;
  moduleName: string;
}

interface QuizAnswers {
  [questionId: string]: string;
}

interface AnswerFeedback {
  isCorrect: boolean;
  correctAnswer: string;
}

export default function QuizModule() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authHeaders } = useAuth();

  const moduleId = searchParams.get('moduleId');

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>({
    loading: true,
    error: '',
    questions: [],
    moduleTitle: '',
    moduleName: '',
  });

  // Current question index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // User answers
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [answerFeedbackByQuestion, setAnswerFeedbackByQuestion] = useState<
    Record<string, AnswerFeedback>
  >({});
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);

  // Quiz submitted
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load questions
  useEffect(() => {
    if (!moduleId) {
      setQuizState((prev) => ({
        ...prev,
        loading: false,
        error: 'Module ID not provided',
      }));
      return;
    }

    const loadQuestions = async () => {
      setQuizState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/modules/${moduleId}/questions/learner`,
          {
            headers: authHeaders(),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to load questions');

        // Assuming the API returns an array of questions or an object with questions
        const questionsList = Array.isArray(data) ? data : data.questions || [];

        if (questionsList.length === 0) {
          setQuizState((prev) => ({
            ...prev,
            loading: false,
            error: 'No questions available for this module',
          }));
          return;
        }

        setQuizState((prev) => ({
          ...prev,
          loading: false,
          questions: questionsList.sort((a, b) => a.order - b.order),
          moduleTitle: data.moduleTitle || 'Quiz',
          moduleName: data.moduleName || 'Module Quiz',
        }));
      } catch (err: any) {
        console.error('Error loading questions:', err);
        setQuizState((prev) => ({
          ...prev,
          loading: false,
          error: err?.message || 'Failed to load questions',
        }));
      }
    };

    loadQuestions();
  }, [moduleId, authHeaders]);

  if (quizState.loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (quizState.error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{quizState.error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  if (quizState.questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          <div className="healthcare-card text-center py-12">
            <p className="text-muted-foreground text-lg">
              No questions available for this module yet.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentQuestion = quizState.questions[currentQuestionIndex];
  const currentOptions =
    currentQuestion.type === 'true-false' &&
    (!Array.isArray(currentQuestion.options) || currentQuestion.options.length < 2)
      ? ['True', 'False']
      : currentQuestion.options;
  const selectedAnswer = answers[currentQuestion._id];
  const currentFeedback = answerFeedbackByQuestion[currentQuestion._id];
  const answeredCount = Object.keys(answers).length;

  // Handle answer selection
  const handleSelectAnswer = async (option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion._id]: option,
    }));

    setIsCheckingAnswer(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions/${currentQuestion._id}/check`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedAnswer: option }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to check answer');
      setAnswerFeedbackByQuestion((prev) => ({
        ...prev,
        [currentQuestion._id]: {
          isCorrect: !!data.isCorrect,
          correctAnswer: String(data.correctAnswer || ''),
        },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  // Handle next question
  const handleNext = () => {
    if (currentQuestionIndex < quizState.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Handle previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle submit quiz
  const handleSubmitQuiz = async () => {
    if (!window.confirm('Are you sure you want to submit the quiz? You cannot change your answers after submission.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        answers: quizState.questions.map((q) => ({
          questionId: q._id,
          selectedAnswer: answers[q._id] || '',
        })),
      };

      const res = await fetch(
        `${API_BASE_URL}/api/modules/${moduleId}/quiz-attempt`,
        {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to submit quiz');

      setQuizResult(data);
      setQuizSubmitted(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show results view
  if (quizSubmitted && quizResult) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          {/* Score Header */}
          <div className="healthcare-card space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Quiz Submitted!
              </h1>
              <p className="text-muted-foreground">
                Here are your results for {quizState.moduleName}
              </p>
            </div>

            {/* Score Circle */}
            <div className="flex justify-center">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${
                  quizResult.percent >= 60
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                    : 'border-amber-500 bg-amber-50 dark:bg-amber-950'
                }`}
              >
                <div className="text-center">
                  <p
                    className={`text-4xl font-bold ${
                      quizResult.percent >= 60
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {quizResult.percent}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {quizResult.score}/{quizResult.totalQuestions}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {quizResult.percent >= 60 ? (
                <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950 max-w-md">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                    Great job! You passed the quiz.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950 max-w-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-600 dark:text-amber-400">
                    You need to improve. Please review the material and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Question Review</h2>

            {quizState.questions.map((question, idx) => {
              const userAnswer = answers[question._id];
              const result = quizResult.answers.find(
                (a) => a.questionId === question._id
              );
              const isCorrect = result?.isCorrect;
              const options =
                question.type === 'true-false' &&
                (!Array.isArray(question.options) || question.options.length < 2)
                  ? ['True', 'False']
                  : question.options;

              return (
                <div
                  key={question._id}
                  className={`healthcare-card space-y-3 border-l-4 ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-destructive bg-destructive/5'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Question {idx + 1}
                        </span>
                        {isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {question.question}
                      </p>
                    </div>
                  </div>

                  {/* Options Review */}
                  <div className="space-y-2">
                    {options.map((option) => {
                      const isUserSelected = userAnswer === option;
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded-lg border text-sm ${
                            isUserSelected && isCorrect
                              ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-medium'
                              : isUserSelected && !isCorrect
                                ? 'border-destructive bg-destructive/10 text-foreground font-medium'
                                : result &&
                                    !isCorrect &&
                                    option ===
                                      result.correctAnswer
                                  ? 'border-destructive bg-destructive/10 text-foreground'
                                  : 'border-border text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isUserSelected && isCorrect && (
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            {isUserSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show correct answer if user got it wrong */}
                  {!isCorrect && result && (
                    <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-600 dark:text-emerald-400 text-sm">
                        Correct answer: <strong>{result.correctAnswer || 'N/A'}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Return to Course
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show quiz taking view
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>

        {/* Header */}
        <div className="healthcare-card space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{quizState.moduleName}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {quizState.questions.length}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / quizState.questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="healthcare-card space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  currentQuestion.type === 'mcq'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'True/False'}
              </span>
              {selectedAnswer && (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentOptions.map((option) => (
              <button
                key={option}
                onClick={() => void handleSelectAnswer(option)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  currentFeedback
                    ? option === currentFeedback.correctAnswer
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                      : selectedAnswer === option
                        ? 'border-destructive bg-destructive/10'
                        : 'border-border'
                    : selectedAnswer === option
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedAnswer === option
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}
                  >
                    {selectedAnswer === option && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-foreground font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Status Message */}
          {isCheckingAnswer && (
            <Alert className="border-primary/40 bg-primary/5">
              <AlertDescription className="text-sm">Checking answer...</AlertDescription>
            </Alert>
          )}
            {!selectedAnswer && !isCheckingAnswer && (
            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
                Please select an answer before proceeding
              </AlertDescription>
            </Alert>
          )}
          {selectedAnswer && currentFeedback && !isCheckingAnswer && (
            <Alert
              className={
                currentFeedback.isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                  : 'border-destructive bg-destructive/5'
              }
            >
              {currentFeedback.isCorrect ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription
                className={
                  currentFeedback.isCorrect
                    ? 'text-emerald-700 dark:text-emerald-300 text-sm'
                    : 'text-destructive text-sm'
                }
              >
                {currentFeedback.isCorrect
                  ? 'Correct answer.'
                  : `Incorrect. Correct answer: ${currentFeedback.correctAnswer}`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {/* Question Indicators */}
          <div className="flex gap-1">
            {quizState.questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                  idx === currentQuestionIndex
                    ? 'bg-primary text-white'
                    : answers[quizState.questions[idx]._id]
                      ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                      : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex < quizState.questions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitQuiz}
              disabled={!selectedAnswer || isSubmitting || answeredCount < quizState.questions.length}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>

        {/* Answered Count */}
        <div className="text-center text-sm text-muted-foreground">
          {answeredCount} of {quizState.questions.length} questions answered
        </div>
      </div>
    </DashboardLayout>
  );
}
