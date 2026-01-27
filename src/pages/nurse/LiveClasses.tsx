import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LiveClassCard } from '@/components/nurse/LiveClassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Calendar,
  Video,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const upcomingClasses = [
  {
    id: 1,
    title: 'Advanced Wound Care Techniques',
    date: 'January 28, 2025',
    time: '10:00 AM - 12:00 PM',
    trainer: 'Dr. Lisa Thompson',
    trainerTitle: 'Wound Care Specialist',
    platform: 'Zoom',
    seatsAvailable: 12,
    totalSeats: 30,
    isRegistered: true,
  },
  {
    id: 2,
    title: 'Pediatric Emergency Response',
    date: 'January 30, 2025',
    time: '2:00 PM - 4:00 PM',
    trainer: 'Dr. Robert Garcia',
    trainerTitle: 'Pediatric ER Director',
    platform: 'Zoom',
    seatsAvailable: 5,
    totalSeats: 25,
    isRegistered: false,
  },
  {
    id: 3,
    title: 'Mental Health First Aid for Nurses',
    date: 'February 1, 2025',
    time: '9:00 AM - 11:00 AM',
    trainer: 'Dr. Amanda Foster',
    trainerTitle: 'Clinical Psychologist',
    platform: 'Zoom',
    seatsAvailable: 18,
    totalSeats: 40,
    isRegistered: false,
  },
  {
    id: 4,
    title: 'Critical Care Nursing Essentials',
    date: 'February 3, 2025',
    time: '1:00 PM - 3:00 PM',
    trainer: 'Dr. Michael Chen',
    trainerTitle: 'ICU Medical Director',
    platform: 'Zoom',
    seatsAvailable: 8,
    totalSeats: 20,
    isRegistered: true,
  },
  {
    id: 5,
    title: 'Pharmacology Updates 2025',
    date: 'February 5, 2025',
    time: '10:00 AM - 12:00 PM',
    trainer: 'Dr. Emily Rodriguez',
    trainerTitle: 'Clinical Pharmacist',
    platform: 'Zoom',
    seatsAvailable: 22,
    totalSeats: 35,
    isRegistered: false,
  },
];

const registeredClasses = upcomingClasses.filter(c => c.isRegistered);

const stats = [
  { label: 'Upcoming Classes', value: 12, icon: Calendar, color: 'text-primary' },
  { label: 'Registered', value: 4, icon: Video, color: 'text-success' },
  { label: 'This Week', value: 3, icon: Clock, color: 'text-warning' },
  { label: 'Total Seats', value: 150, icon: Users, color: 'text-muted-foreground' },
];

export default function LiveClasses() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Live Classes & Workshops</h1>
            <p className="text-muted-foreground mt-1">
              Join interactive training sessions with expert instructors
            </p>
          </div>
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
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

        {/* Calendar Navigation */}
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
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search classes..." className="pl-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="pediatrics">Pediatrics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">Upcoming Classes</TabsTrigger>
              <TabsTrigger value="registered">My Registrations</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingClasses.map((liveClass) => (
                <LiveClassCard key={liveClass.id} {...liveClass} />
              ))}
            </TabsContent>

            <TabsContent value="registered" className="space-y-4">
              {registeredClasses.length > 0 ? (
                registeredClasses.map((liveClass) => (
                  <LiveClassCard key={liveClass.id} {...liveClass} />
                ))
              ) : (
                <div className="text-center py-12">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No registered classes yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <div className="text-center py-12">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No completed classes to show</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
