import { useState } from 'react';
import { ArrowLeft, Search, MessageCircle, Mail, Phone, ExternalLink, ChevronRight, Book, Video, FileText, Bug } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';

interface HelpSupportScreenProps {
  onBack: () => void;
}

const faqData = [
  {
    id: '1',
    question: 'How do I connect my brokerage account?',
    answer: 'You can connect your brokerage account through the Portfolio section. Tap "Connect Account" and select your broker from the list. We use Plaid for secure, read-only access to your account data.',
    category: 'Getting Started'
  },
  {
    id: '2',
    question: 'What types of alerts can I set up?',
    answer: 'Catalyst supports price alerts, catalyst alerts (earnings, events), volume alerts, and news alerts. You can customize each alert with different priority levels and notification methods.',
    category: 'Alerts'
  },
  {
    id: '3',
    question: 'How accurate are the AI insights?',
    answer: 'Our AI insights are generated using advanced machine learning models that analyze market data, news, and historical patterns. Each insight includes a confidence score to help you gauge reliability.',
    category: 'AI Features'
  },
  {
    id: '4',
    question: 'Is my financial data secure?',
    answer: 'Yes, we use bank-level encryption and security measures. We never store your login credentials and only access read-only account data through our secure banking partners.',
    category: 'Security'
  },
  {
    id: '5',
    question: 'Can I trade directly through Catalyst?',
    answer: 'No, Catalyst is a research and tracking tool. When you want to execute trades, we\'ll direct you to your connected brokerage app or website.',
    category: 'Trading'
  },
  {
    id: '6',
    question: 'How often is data updated?',
    answer: 'Market data is updated in real-time during trading hours. Portfolio data syncs every 15 minutes, though you can manually refresh at any time.',
    category: 'Data'
  }
];

const quickActions = [
  {
    id: 'chat',
    title: 'Live Chat',
    description: 'Chat with our support team',
    icon: MessageCircle,
    available: true,
    action: () => {}
  },
  {
    id: 'email',
    title: 'Email Support',
    description: 'Send us a detailed message',
    icon: Mail,
    available: true,
    action: () => {}
  },
  {
    id: 'phone',
    title: 'Phone Support',
    description: 'Call our support line',
    icon: Phone,
    available: false,
    action: () => {}
  }
];

const resources = [
  {
    id: 'getting-started',
    title: 'Getting Started Guide',
    description: 'Learn the basics of using Catalyst',
    icon: Book,
    type: 'guide'
  },
  {
    id: 'video-tutorials',
    title: 'Video Tutorials',
    description: 'Watch step-by-step tutorials',
    icon: Video,
    type: 'video'
  },
  {
    id: 'api-docs',
    title: 'API Documentation',
    description: 'For developers and advanced users',
    icon: FileText,
    type: 'docs'
  },
  {
    id: 'release-notes',
    title: 'Release Notes',
    description: 'Latest features and updates',
    icon: ExternalLink,
    type: 'updates'
  }
];

export function HelpSupportScreen({ onBack }: HelpSupportScreenProps) {
  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(faqData.map(faq => faq.category)))];
  
  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1>Help & Support</h1>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Contact Support</h3>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={!action.available}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-2 bg-primary/10 rounded-full">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>
                  {action.available ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Resources */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            {resources.map((resource) => {
              const IconComponent = resource.icon;
              return (
                <button
                  key={resource.id}
                  className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className="text-xs">
                      {resource.type}
                    </Badge>
                  </div>
                  <div className="font-medium text-sm">{resource.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{resource.description}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* FAQ Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category === 'all' ? 'All' : category}
            </Button>
          ))}
        </div>

        {/* FAQ */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Frequently Asked Questions</h3>
          
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No FAQs match your search</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">
                    <div>
                      <div>{faq.question}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {faq.category}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </Card>

        {/* Report Issue */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Still Need Help?</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Bug className="h-4 w-4 mr-2" />
              Report a Bug
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageCircle className="h-4 w-4 mr-2" />
              Feature Request
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span> support@catalyst.app
            </div>
            <div>
              <span className="text-muted-foreground">Hours:</span> Mon-Fri 9AM-6PM EST
            </div>
            <div>
              <span className="text-muted-foreground">Response Time:</span> Usually within 2-4 hours
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}