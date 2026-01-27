import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  ClipboardCheck, 
  Target, 
  Clock, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const performanceStats = [
  { label: 'Quizzes Passed', value: '85%', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Simulation Success', value: '92%', icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Time Spent', value: '47.5h', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'Retakes Pending', value: '2', icon: RotateCcw, color: 'text-destructive', bg: 'bg-destructive/10' },
];

const quizHistory = [
  { id: 1, module: 'Ventilator Management', quiz: 'Module Assessment', score: 92, status: 'passed', date: 'Jan 25, 2025' },
  { id: 2, module: 'IV Medication Safety', quiz: 'Final Quiz', score: 88, status: 'passed', date: 'Jan 22, 2025' },
  { id: 3, module: 'CPR & ACLS', quiz: 'Certification Exam', score: 95, status: 'passed', date: 'Jan 18, 2025' },
  { id: 4, module: 'Sepsis Recognition', quiz: 'Module Assessment', score: 65, status: 'failed', date: 'Jan 15, 2025' },
  { id: 5, module: 'Patient Fall Prevention', quiz: 'Final Quiz', score: 78, status: 'passed', date: 'Jan 12, 2025' },
  { id: 6, module: 'Medication Administration', quiz: 'Mid-Module Quiz', score: 82, status: 'passed', date: 'Jan 10, 2025' },
];

const pendingQuizzes = [
  { 
    id: 1, 
    module: 'Sepsis Recognition & Early Intervention', 
    department: 'ICU', 
    supervisor: 'Dr. Michael Brown',
    duration: '30 mins',
    type: 'Retake'
  },
  { 
    id: 2, 
    module: 'Infection Control & Prevention', 
    department: 'General',
    supervisor: 'Dr. Amanda Foster',
    duration: '45 mins',
    type: 'New'
  },
  { 
    id: 3, 
    module: 'Blood Transfusion Protocols', 
    department: 'Emergency',
    supervisor: 'Dr. James Peterson',
    duration: '30 mins',
    type: 'New'
  },
];

export default function Assessments() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessments & Feedback</h1>
          <p className="text-muted-foreground mt-1">
            Track your quiz performance and pending assessments
          </p>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceStats.map((stat) => (
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

        {/* Progress Overview */}
        <div className="healthcare-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Overall Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Quiz Completion</span>
                <span className="font-medium text-foreground">24/28</span>
              </div>
              <Progress value={86} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Simulations</span>
                <span className="font-medium text-foreground">8/10</span>
              </div>
              <Progress value={80} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Supervisor Reviews</span>
                <span className="font-medium text-foreground">5/6</span>
              </div>
              <Progress value={83} className="h-2" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending Quizzes</TabsTrigger>
            <TabsTrigger value="history">Quiz History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingQuizzes.map((quiz) => (
                <div key={quiz.id} className="healthcare-card">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      quiz.type === 'Retake' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                    }`}>
                      {quiz.type}
                    </span>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{quiz.module}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground mb-4">
                    <p>Department: {quiz.department}</p>
                    <p>Supervisor: {quiz.supervisor}</p>
                    <p>Duration: {quiz.duration}</p>
                  </div>
                  <Button className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Start Quiz
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="healthcare-card overflow-x-auto">
              <table className="table-healthcare">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Quiz Title</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quizHistory.map((quiz) => (
                    <tr key={quiz.id}>
                      <td className="font-medium text-foreground">{quiz.module}</td>
                      <td>{quiz.quiz}</td>
                      <td>
                        <span className={`font-semibold ${
                          quiz.score >= 80 ? 'text-success' : quiz.score >= 70 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {quiz.score}%
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          quiz.status === 'passed' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {quiz.status === 'passed' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{quiz.date}</td>
                      <td className="text-right">
                        {quiz.status === 'failed' ? (
                          <Button size="sm" variant="outline">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retake
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost">View Details</Button>
                        )}
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
