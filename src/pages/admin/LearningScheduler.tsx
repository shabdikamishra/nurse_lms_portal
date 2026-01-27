import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Video
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const scheduledEvents = [
  { id: 1, title: 'Ventilator Training - ICU', date: '2025-01-27', time: '09:00 AM', type: 'module', department: 'ICU', participants: 24 },
  { id: 2, title: 'CPR Certification Class', date: '2025-01-27', time: '02:00 PM', type: 'live', department: 'Emergency', participants: 30 },
  { id: 3, title: 'Medication Safety Quiz', date: '2025-01-28', time: '10:00 AM', type: 'assessment', department: 'General', participants: 156 },
  { id: 4, title: 'Infection Control Workshop', date: '2025-01-28', time: '01:00 PM', type: 'live', department: 'General', participants: 45 },
  { id: 5, title: 'Pediatric Emergency Response', date: '2025-01-29', time: '09:00 AM', type: 'module', department: 'Pediatrics', participants: 18 },
  { id: 6, title: 'ACLS Renewal Session', date: '2025-01-30', time: '11:00 AM', type: 'live', department: 'Cardiology', participants: 20 },
  { id: 7, title: 'Wound Care Certification', date: '2025-01-31', time: '02:00 PM', type: 'assessment', department: 'Surgery', participants: 35 },
];

const calendarDays = [
  { day: 'Mon', date: 27, events: 2, isToday: true },
  { day: 'Tue', date: 28, events: 2, isToday: false },
  { day: 'Wed', date: 29, events: 1, isToday: false },
  { day: 'Thu', date: 30, events: 1, isToday: false },
  { day: 'Fri', date: 31, events: 1, isToday: false },
  { day: 'Sat', date: 1, events: 0, isToday: false },
  { day: 'Sun', date: 2, events: 0, isToday: false },
];

const stats = [
  { label: 'This Week', value: 12, icon: Calendar, color: 'text-primary' },
  { label: 'Upcoming', value: 34, icon: Clock, color: 'text-warning' },
  { label: 'Live Sessions', value: 8, icon: Video, color: 'text-success' },
  { label: 'Total Participants', value: 456, icon: Users, color: 'text-info' },
];

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'module': return 'border-l-primary bg-primary/5';
    case 'live': return 'border-l-success bg-success/5';
    case 'assessment': return 'border-l-warning bg-warning/5';
    default: return 'border-l-muted bg-muted/5';
  }
};

const getEventTypeIcon = (type: string) => {
  switch (type) {
    case 'module': return BookOpen;
    case 'live': return Video;
    case 'assessment': return Clock;
    default: return Calendar;
  }
};

export default function LearningScheduler() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Learning Scheduler</h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage training sessions across departments
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="healthcare-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Controls */}
        <div className="healthcare-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold text-foreground">January 2025</h3>
              <Button variant="outline" size="icon">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">Today</Button>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="rn">Registered Nurse</SelectItem>
                  <SelectItem value="np">Nurse Practitioner</SelectItem>
                  <SelectItem value="cn">Clinical Nurse</SelectItem>
                </SelectContent>
              </Select>
              <Tabs defaultValue="week">
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Week View */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {calendarDays.map((day) => (
              <div 
                key={day.date} 
                className={`p-3 rounded-lg text-center cursor-pointer transition-colors ${
                  day.isToday 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <p className="text-xs font-medium opacity-80">{day.day}</p>
                <p className="text-lg font-bold">{day.date}</p>
                {day.events > 0 && (
                  <p className={`text-xs mt-1 ${day.isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {day.events} events
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Event Legend */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Module</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Live Session</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">Assessment</span>
            </div>
          </div>

          {/* Scheduled Events */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Upcoming Sessions</h4>
            {scheduledEvents.map((event) => {
              const Icon = getEventTypeIcon(event.type);
              return (
                <div 
                  key={event.id} 
                  className={`p-4 rounded-lg border-l-4 ${getEventTypeColor(event.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center mt-0.5">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h5 className="font-medium text-foreground">{event.title}</h5>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{event.date}</span>
                          <span>{event.time}</span>
                          <span>{event.department}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        <Users className="w-4 h-4 inline mr-1" />
                        {event.participants}
                      </span>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
