import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Printer, Download, User, Shield, ShieldCheck, FileText, Sparkles, HelpCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { UserGuideContent } from '@/components/user-guide/UserGuideContent';
import { AdminGuideContent } from '@/components/user-guide/AdminGuideContent';
import { UpdatedUserGuideContent } from '@/components/user-guide/UpdatedUserGuideContent';
import { UpdatedAdminGuideContent } from '@/components/user-guide/UpdatedAdminGuideContent';
import { QuickSheetsTab } from '@/components/help-center/QuickSheetsTab';
import { WhatsNewTab } from '@/components/help-center/WhatsNewTab';

export default function HelpCenter() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const showAdminGuide = isAdmin || isHR || isSuperAdmin;
  
  const [activeTab, setActiveTab] = useState('whats-new');
  const [unreadCount, setUnreadCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleUnreadCountChange = (count: number) => {
    setUnreadCount(count);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
                <p className="text-muted-foreground mt-1">
                  Guides, quick references, and portal updates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap mb-8">
              <TabsList className="inline-flex h-auto p-1 bg-muted/50">
                <TabsTrigger 
                  value="whats-new" 
                  className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>What's New</span>
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="user" 
                  className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                >
                  <User className="h-4 w-4" />
                  User Guide
                </TabsTrigger>
                <TabsTrigger 
                  value="updated-guide" 
                  className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                >
                  <BookOpen className="h-4 w-4" />
                  Updated User Guide
                </TabsTrigger>
                {showAdminGuide && (
                  <TabsTrigger 
                    value="admin" 
                    className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Guide
                  </TabsTrigger>
                )}
                {showAdminGuide && (
                  <TabsTrigger 
                    value="updated-admin" 
                    className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Updated Admin Guide
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="quick-sheets" 
                  className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background"
                >
                  <FileText className="h-4 w-4" />
                  Quick Sheets
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div ref={contentRef}>
              <TabsContent value="whats-new" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <WhatsNewTab onUnreadCountChange={handleUnreadCountChange} />
                </div>
              </TabsContent>

              <TabsContent value="user" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <UserGuideContent />
                </div>
              </TabsContent>

              <TabsContent value="updated-guide" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <UpdatedUserGuideContent />
                </div>
              </TabsContent>

              {showAdminGuide && (
                <TabsContent value="admin" className="mt-0">
                  <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                    <AdminGuideContent />
                  </div>
                </TabsContent>
              )}

              {showAdminGuide && (
                <TabsContent value="updated-admin" className="mt-0">
                  <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                    <UpdatedAdminGuideContent />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="quick-sheets" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <QuickSheetsTab />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, .no-print, button {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            font-size: 12pt;
          }
          .container {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </Layout>
  );
}
