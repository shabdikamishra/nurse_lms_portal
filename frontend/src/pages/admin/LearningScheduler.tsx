import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Video,
  X
} from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 27)); // January 2025
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Get the first day of the month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Create calendar grid
  const calendarGrid = [];
  let week = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    week.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      calendarGrid.push(week);
      week = [];
    }
  }

  // Fill remaining cells with next month's days
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    calendarGrid.push(week);
  }

  // Get events for the current month
  const currentMonthEvents = scheduledEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getMonth() === currentDate.getMonth() &&
           eventDate.getFullYear() === currentDate.getFullYear();
  });

  // Get events for a specific date
  const getEventsForDate = (day: number): typeof scheduledEvents => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return scheduledEvents.filter(event => event.date === dateStr);
  };

  // Month navigation
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

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
          <Button onClick={() => setShowScheduleModal(true)}>
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

        {/* Calendar */}
        <div className="healthcare-card">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold text-foreground w-40">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
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
            </div>
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

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="p-3 text-center border-b border-border">
                <p className="text-sm font-semibold text-foreground">{day}</p>
              </div>
            ))}

            {/* Calendar cells */}
            {calendarGrid.map((week, weekIndex) => (
              week.map((day, dayIndex) => {
                const dayEvents = day ? getEventsForDate(day) : [];
                const today = new Date();
                const isToday = day &&
                  day === today.getDate() &&
                  currentDate.getMonth() === today.getMonth() &&
                  currentDate.getFullYear() === today.getFullYear();

                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`min-h-28 p-2 border rounded-lg ${
                      day
                        ? isToday
                          ? 'bg-primary/5 border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-primary' : 'text-foreground'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => {
                            const bgColor =
                              event.type === 'module' ? 'bg-primary/20 text-primary' :
                              event.type === 'live' ? 'bg-success/20 text-success' :
                              'bg-warning/20 text-warning';
                            return (
                              <div
                                key={event.id}
                                className={`text-xs px-1.5 py-0.5 rounded ${bgColor} truncate font-medium`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1.5 py-0.5">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ))}
          </div>

          {/* Upcoming Sessions for current month */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">
              Upcoming Sessions - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h4>
            {currentMonthEvents.length > 0 ? (
              <div className="space-y-3">
                {currentMonthEvents.map((event) => {
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
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions scheduled for this month</p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Session Modal */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Calendar */}
              <div>
                <label className="text-sm font-medium text-foreground">Select Date</label>
                <div className="border rounded-lg p-4 bg-card mt-2">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full"
                  />
                </div>
                {selectedDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Session Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Session Title</label>
                  <Input 
                    placeholder="e.g., Ventilator Training" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Time</label>
                  <Input 
                    type="time" 
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icu">ICU</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="surgery">Surgery</SelectItem>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Session Type</label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live Session</SelectItem>
                      <SelectItem value="module">Module</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea 
                  placeholder="Enter session description" 
                  className="w-full border rounded-lg p-2 mt-1 bg-background text-foreground placeholder-muted-foreground"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button>
                  Schedule Session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
