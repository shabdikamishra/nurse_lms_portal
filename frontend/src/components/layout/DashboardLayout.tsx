import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AppSidebar />
      <main 
        className={cn(
          "transition-all duration-300 min-h-screen",
          "ml-16 lg:ml-64"
        )}
      >
        <div className="flex justify-end px-6 pt-4 lg:px-8">
          <NotificationBell />
        </div>
        <div className="p-6 pt-2 lg:p-8 lg:pt-2">
          {children}
        </div>
      </main>

      {/* Floating Chatbot Button */}
      <button
        onClick={() => {
          alert("Chatbot integration is coming soon!");
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
        )}
        title="Query / Doubts chatbot"
        id="chatbot-trigger-button"
        type="button"
      >
        <MessageCircle className="w-7 h-7 transition-transform group-hover:rotate-12" />
        <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-150 origin-right bg-popover text-popover-foreground border text-xs px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap font-medium">
          Queries & Doubts Help
        </span>
      </button>
    </div>
  );
}

