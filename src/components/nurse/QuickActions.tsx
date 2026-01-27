import { 
  PlayCircle, 
  Calendar, 
  MessageSquare, 
  ClipboardList, 
  Video, 
  Award, 
  Bookmark 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  variant?: 'default' | 'outline';
}

const quickActions: QuickAction[] = [
  { icon: PlayCircle, label: 'Resume Learning', description: 'Continue where you left off', variant: 'default' },
  { icon: Calendar, label: 'Book Check-in', description: 'Schedule supervisor meeting' },
  { icon: MessageSquare, label: 'Ask AI', description: 'Get instant answers' },
  { icon: ClipboardList, label: 'Quiz Results', description: 'View last assessment' },
  { icon: Video, label: 'Skill Demos', description: 'Watch training videos' },
  { icon: Award, label: 'Certificates', description: 'Download your certificates' },
  { icon: Bookmark, label: 'Bookmarks', description: 'Saved learning materials' },
];

export function QuickActions() {
  return (
    <div className="healthcare-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <Button
            key={action.label}
            variant={action.variant || 'outline'}
            className={`h-auto py-3 px-4 justify-start gap-3 ${
              action.variant === 'default' 
                ? '' 
                : 'hover:bg-accent hover:border-primary/20'
            }`}
          >
            <action.icon className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <p className="font-medium">{action.label}</p>
              <p className={`text-xs ${action.variant === 'default' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {action.description}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
