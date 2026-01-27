import { Calendar, Clock, Video, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveClassCardProps {
  title: string;
  date: string;
  time: string;
  trainer: string;
  trainerTitle: string;
  platform: string;
  seatsAvailable: number;
  totalSeats: number;
  isRegistered?: boolean;
}

export function LiveClassCard({ 
  title, 
  date, 
  time, 
  trainer, 
  trainerTitle,
  platform, 
  seatsAvailable, 
  totalSeats,
  isRegistered = false 
}: LiveClassCardProps) {
  const isFull = seatsAvailable === 0;

  return (
    <div className="healthcare-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2">{title}</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
              <span className="text-border">•</span>
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{trainer}</span>
              <span className="text-xs text-muted-foreground/70">({trainerTitle})</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Video className="w-4 h-4" />
                <span>{platform}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{seatsAvailable} of {totalSeats} seats</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {isRegistered ? (
            <>
              <span className="badge-success">Registered</span>
              <Button variant="outline" size="sm">
                Join Meeting
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              disabled={isFull}
            >
              {isFull ? 'Class Full' : 'Register'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
