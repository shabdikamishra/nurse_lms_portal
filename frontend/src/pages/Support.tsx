import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  MessageSquare,
  Phone,
  Mail,
  FileText,
  ChevronRight,
  Search
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'You can reset your password by clicking "Forgot password?" on the login page. Enter your email address and follow the instructions sent to your inbox.'
  },
  {
    question: 'How can I download my certificates?',
    answer: 'Go to Certifications & Compliance section, find your certificate in the list, and click the "Download PDF" button. You can also download all certificates at once using the "Download All" button.'
  },
  {
    question: 'What happens if I fail a quiz?',
    answer: 'If you fail a quiz, you will have the opportunity to retake it after reviewing the module content. Retake attempts are tracked in your Assessments section.'
  },
  {
    question: 'How do I register for a live class?',
    answer: 'Navigate to Live Classes & Workshops, find the class you want to attend, and click "Register". Make sure to check seat availability before registering.'
  },
  {
    question: 'Can I access modules on mobile devices?',
    answer: 'Yes, NurseLMS is fully responsive and can be accessed on tablets and smartphones. However, for the best experience with video content, we recommend using a desktop or laptop.'
  },
  {
    question: 'How do I contact my supervisor?',
    answer: 'You can find your supervisor\'s contact information in your profile section. For urgent training-related queries, use the Quick Actions panel on your dashboard.'
  },
];

const contactOptions = [
  { icon: MessageSquare, title: 'Live Chat', description: 'Chat with our support team', action: 'Start Chat', available: true },
  { icon: Phone, title: 'Phone Support', description: 'Call us at 1-800-NURSE-LMS', action: 'Call Now', available: true },
  { icon: Mail, title: 'Email Support', description: 'support@nurselms.com', action: 'Send Email', available: true },
  { icon: FileText, title: 'Documentation', description: 'Browse our knowledge base', action: 'View Docs', available: true },
];

export default function Support() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
          <p className="text-muted-foreground mt-1">
            Get help with NurseLMS or contact our support team
          </p>
        </div>

        {/* Search */}
        <div className="healthcare-card">
          <div className="max-w-2xl mx-auto text-center">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">How can we help you?</h2>
            <p className="text-muted-foreground mb-6">Search our knowledge base or browse FAQs below</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search for help articles..." 
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactOptions.map((option) => (
            <div key={option.title} className="healthcare-card text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <option.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{option.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
              <Button variant="outline" size="sm" className="w-full">
                {option.action}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAQs */}
          <div className="healthcare-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h3>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact Form */}
          <div className="healthcare-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Send us a Message</h3>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Brief description of your issue" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a category</option>
                  <option value="technical">Technical Issue</option>
                  <option value="account">Account & Access</option>
                  <option value="content">Course Content</option>
                  <option value="certification">Certifications</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Describe your issue in detail..." 
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Submit Ticket
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
