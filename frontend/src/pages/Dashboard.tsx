import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NurseDashboard from './NurseDashboard';
import AdminDashboard from './AdminDashboard';
import SupervisorDashboard from './supervisor/SupervisorDashboard';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'supervisor') {
    return <SupervisorDashboard />;
  }

  return <NurseDashboard />;
}
