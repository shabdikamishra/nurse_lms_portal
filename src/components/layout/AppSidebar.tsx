import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  ClipboardCheck, 
  Award, 
  Library, 
  Calendar, 
  Users, 
  BarChart3, 
  HelpCircle, 
  LogOut,
  Stethoscope,
  ChevronLeft
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('nurse' | 'admin')[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['nurse', 'admin'] },
  { title: 'Assigned Modules', href: '/modules', icon: BookOpen, roles: ['nurse'] },
  { title: 'Live Classes', href: '/live-classes', icon: Video, roles: ['nurse'] },
  { title: 'Assessments', href: '/assessments', icon: ClipboardCheck, roles: ['nurse'] },
  { title: 'Certifications', href: '/certifications', icon: Award, roles: ['nurse'] },
  { title: 'Certifications', href: '/admin/certifications', icon: Award, roles: ['admin'] },
  { title: 'Course Library', href: '/course-library', icon: Library, roles: ['admin'] },
  { title: 'Learning Scheduler', href: '/scheduler', icon: Calendar, roles: ['admin'] },
  { title: 'User Management', href: '/users', icon: Users, roles: ['admin'] },
  { title: 'Reports', href: '/reports', icon: BarChart3, roles: ['nurse'] },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3, roles: ['admin'] },
  { title: 'Support', href: '/support', icon: HelpCircle, roles: ['nurse', 'admin'] },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary/20">
          <Stethoscope className="w-6 h-6 text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-sidebar-foreground truncate">NurseLMS</h1>
            <p className="text-xs text-sidebar-foreground/60">Learning Platform</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-destructive transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
