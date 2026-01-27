import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Nurse Pages
import AssignedModules from "./pages/nurse/AssignedModules";
import LiveClasses from "./pages/nurse/LiveClasses";
import Assessments from "./pages/nurse/Assessments";
import NurseCertifications from "./pages/nurse/Certifications";
import NurseReports from "./pages/nurse/Reports";

// Admin Pages
import AdminCertifications from "./pages/admin/Certifications";
import CourseLibrary from "./pages/admin/CourseLibrary";
import LearningScheduler from "./pages/admin/LearningScheduler";
import UserManagement from "./pages/admin/UserManagement";
import AdminReports from "./pages/admin/Reports";

// Shared Pages
import Support from "./pages/Support";

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
            <Route path="/modules" element={<AssignedModules />} />
            <Route path="/live-classes" element={<LiveClasses />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/certifications" element={<NurseCertifications />} />
            <Route path="/reports" element={<NurseReports />} />
            
            {/* Admin Routes */}
            <Route path="/admin/certifications" element={<AdminCertifications />} />
            <Route path="/course-library" element={<CourseLibrary />} />
            <Route path="/scheduler" element={<LearningScheduler />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            
            {/* Shared Routes */}
            <Route path="/support" element={<Support />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
