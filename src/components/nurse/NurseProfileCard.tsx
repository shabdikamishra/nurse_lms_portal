import { User } from '@/contexts/AuthContext';
import { Mail, Building2, UserCheck, Clock } from 'lucide-react';

interface NurseProfileCardProps {
  user: User;
  completedModules: number;
  totalModules: number;
}

export function NurseProfileCard({ user, completedModules, totalModules }: NurseProfileCardProps) {
  const progressPercentage = Math.round((completedModules / totalModules) * 100);

  return (
    <div className="healthcare-card">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-semibold text-primary">
            {user.name.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            {user.department && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{user.department}</span>
              </div>
            )}
            {user.supervisor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                <span>Reports to: {user.supervisor}</span>
              </div>
            )}
            {user.shiftTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Shift: {user.shiftTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Learning Progress</span>
          <span className="text-sm font-semibold text-primary">{progressPercentage}%</span>
        </div>
        <div className="progress-healthcare">
          <div 
            className="progress-healthcare-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedModules} of {totalModules} modules completed
        </p>
      </div>
    </div>
  );
}
