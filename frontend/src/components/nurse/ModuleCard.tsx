import { Clock, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ModuleStatus = 'not-started' | 'in-progress' | 'completed';

interface ModuleCardProps {
  title: string;
  author: string;
  thumbnail: string;
  status: ModuleStatus;
  duration?: string;
  progress?: number;
  onOpen?: () => void;
}

const statusConfig: Record<ModuleStatus, { label: string; className: string }> = {
  'not-started': { label: 'Not Started', className: 'badge-neutral' },
  'in-progress': { label: 'In Progress', className: 'badge-info' },
  'completed': { label: 'Completed', className: 'badge-success' },
};

export function ModuleCard({ title, author, thumbnail, status, duration, progress, onOpen }: ModuleCardProps) {
  const { label, className } = statusConfig[status];

  return (
    <div className="healthcare-card-hover group cursor-pointer">
      <div className="aspect-video rounded-lg bg-muted overflow-hidden mb-4">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-contain bg-gradient-to-b from-info/5 to-muted group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <span className={className}>
            {status === 'completed' ? '🟢' : status === 'in-progress' ? '🔵' : '⚪'} {label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>{author}</span>
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
          )}
        </div>

        {status === 'in-progress' && progress !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <div className="progress-healthcare">
              <div className="progress-healthcare-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <Button 
          variant={status === 'completed' ? 'outline' : 'default'} 
          className={`w-full mt-2 transition-colors ${
            status === 'completed'
              ? 'border-success/30 text-success hover:bg-success/10'
              : 'bg-primary hover:bg-primary/90'
          }`}
          size="sm"
          onClick={onOpen}
        >
          {status === 'not-started' && 'Start Module'}
          {status === 'in-progress' && 'Continue Learning'}
          {status === 'completed' && 'Review Module'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
