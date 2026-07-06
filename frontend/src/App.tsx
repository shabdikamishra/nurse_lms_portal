import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Nurse Pages
import MyCourses from "./pages/nurse/MyCourses";
import CourseModules from "./pages/nurse/CourseModules";
import AssignedModules from "./pages/nurse/AssignedModules";
import LiveClasses from "./pages/nurse/LiveClasses";
import Assessments from "./pages/nurse/Assessments";
import NurseCertifications from "./pages/nurse/Certifications";
import NurseReports from "./pages/nurse/Reports";
import QuizModule from "./pages/nurse/QuizModule";
import NurseModuleDetail from "./pages/nurse/ModuleDetail";

// Admin Pages
import AdminCertifications from "./pages/admin/Certifications";
import CourseLibrary from "./pages/admin/CourseLibrary";
import ModulesPage from "./pages/admin/ModulesPage";
import LearningScheduler from "./pages/admin/LearningScheduler";
import UserManagement from "./pages/admin/UserManagement";
import AdminReports from "./pages/admin/Reports";
import AssignModulesPage from "./pages/admin/AssignModulesPage";
import RegisterNursePage from "./pages/admin/RegisterNursePage";
import PendingCourseApprovals from "./pages/admin/PendingCourseApprovals";

// Supervisor Pages
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";

// Shared Pages
import Support from "./pages/Support";
import ChangePassword from "./pages/ChangePassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Nurse Routes */}
            <Route path="/modules" element={<MyCourses />} />
            <Route path="/courses/:courseId" element={<CourseModules />} />
            <Route path="/courses/:courseId/modules/:moduleId" element={<NurseModuleDetail />} />
            <Route path="/modules/legacy" element={<AssignedModules />} />
            <Route path="/live-classes" element={<LiveClasses />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/certifications" element={<NurseCertifications />} />
            <Route path="/reports" element={<NurseReports />} />
            <Route path="/quiz" element={<QuizModule />} />
            
            {/* Admin Routes */}
            <Route path="/admin/certifications" element={<ProtectedRoute roles={['admin']}><AdminCertifications /></ProtectedRoute>} />
            <Route path="/course-library" element={<ProtectedRoute roles={['admin']}><CourseLibrary /></ProtectedRoute>} />
            <Route path="/modules-page" element={<ProtectedRoute roles={['admin']}><ModulesPage /></ProtectedRoute>} />
            <Route path="/scheduler" element={<ProtectedRoute roles={['admin']}><LearningScheduler /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/assign-modules" element={<ProtectedRoute roles={['admin']}><AssignModulesPage /></ProtectedRoute>} />
            <Route path="/admin/register-nurse" element={<ProtectedRoute roles={['admin']}><RegisterNursePage /></ProtectedRoute>} />
            <Route path="/admin/pending-approvals" element={<ProtectedRoute roles={['admin']}><PendingCourseApprovals /></ProtectedRoute>} />

            {/* Supervisor Routes */}
            <Route path="/supervisor/dashboard" element={<ProtectedRoute roles={['supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
            <Route path="/supervisor/course-library" element={<ProtectedRoute roles={['supervisor']}><CourseLibrary /></ProtectedRoute>} />
            <Route path="/supervisor/register-nurse" element={<ProtectedRoute roles={['supervisor']}><RegisterNursePage /></ProtectedRoute>} />
            <Route path="/supervisor/assign-modules" element={<ProtectedRoute roles={['supervisor']}><AssignModulesPage /></ProtectedRoute>} />
            
            {/* Shared Routes */}
            <Route path="/support" element={<Support />} />
            <Route path="/change-password" element={<ChangePassword />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
