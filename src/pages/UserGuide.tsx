import { useState, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Printer, Download, User, Shield } from 'lucide-react';

import { UserGuideContent } from '@/components/user-guide/UserGuideContent';
import { AdminGuideContent } from '@/components/user-guide/AdminGuideContent';

export default function UserGuide() {
  const [activeTab, setActiveTab] = useState('user');
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">VFS Agent Portal Guide</h1>
              <p className="text-muted-foreground mt-1">
                Complete documentation for all portal features and functions
              </p>
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
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                For Users
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                For Admins
              </TabsTrigger>
            </TabsList>

            <div ref={contentRef}>
              <TabsContent value="user" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <UserGuideContent />
                </div>
              </TabsContent>

              <TabsContent value="admin" className="mt-0">
                <div className="bg-card rounded-lg border p-6 md:p-8 shadow-sm">
                  <AdminGuideContent />
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
