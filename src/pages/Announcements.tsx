import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, User, Users, Shield, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AnnouncementTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fileName: string;
  description: string;
}

const ANNOUNCEMENT_TABS: AnnouncementTab[] = [
  {
    id: 'user',
    label: 'User Guide',
    icon: User,
    fileName: 'user-announcement.txt',
    description: 'Complete guide for all standard users - viewing updates, submitting requests, and more.',
  },
  {
    id: 'hr',
    label: 'HR Guide',
    icon: Users,
    fileName: 'hr-announcement.txt',
    description: 'Extended guide for HR team members - leave management, profiles, and statistics.',
  },
  {
    id: 'admin',
    label: 'Admin Guide',
    icon: Shield,
    fileName: 'admin-announcement.txt',
    description: 'Full administrative guide - content management, questions, and portal oversight.',
  },
  {
    id: 'super-admin',
    label: 'Super Admin Guide',
    icon: Crown,
    fileName: 'super-admin-announcement.txt',
    description: 'Complete system control guide - user management, roles, and configuration.',
  },
];

export default function Announcements() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('user');
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Determine which tabs to show based on role
  const getVisibleTabs = () => {
    if (isSuperAdmin) return ANNOUNCEMENT_TABS;
    if (isAdmin) return ANNOUNCEMENT_TABS.filter(t => t.id !== 'super-admin');
    if (isHR) return ANNOUNCEMENT_TABS.filter(t => ['user', 'hr'].includes(t.id));
    return ANNOUNCEMENT_TABS.filter(t => t.id === 'user');
  };

  const visibleTabs = getVisibleTabs();

  const loadContent = async (fileName: string, tabId: string) => {
    if (content[tabId]) return; // Already loaded
    
    setLoading(prev => ({ ...prev, [tabId]: true }));
    try {
      const response = await fetch(`/announcements/${fileName}`);
      const text = await response.text();
      setContent(prev => ({ ...prev, [tabId]: text }));
    } catch (error) {
      console.error('Failed to load announcement:', error);
      setContent(prev => ({ ...prev, [tabId]: 'Failed to load content. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const tab = ANNOUNCEMENT_TABS.find(t => t.id === tabId);
    if (tab) {
      loadContent(tab.fileName, tabId);
    }
  };

  const handleDownload = (tab: AnnouncementTab) => {
    const link = document.createElement('a');
    link.href = `/announcements/${tab.fileName}`;
    link.download = tab.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load first tab content on mount
  useState(() => {
    const firstTab = visibleTabs[0];
    if (firstTab) {
      loadContent(firstTab.fileName, firstTab.id);
    }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Portal Announcements</h1>
          <p className="text-muted-foreground">
            Comprehensive guides and announcements for the VFS Agent Portal. Download or view guides for your role.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border rounded-lg"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <tab.icon className="h-5 w-5 text-primary" />
                      {tab.label}
                    </CardTitle>
                    <CardDescription>{tab.description}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(tab)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading[tab.id] ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-pulse text-muted-foreground">Loading...</div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-auto">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
                        {content[tab.id] || 'Click to load content...'}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Download Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quick Downloads
            </CardTitle>
            <CardDescription>Download announcement files for offline reference</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {visibleTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-auto py-3 px-4"
                  onClick={() => handleDownload(tab)}
                >
                  <tab.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-muted-foreground">{tab.fileName}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
