import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, User, Users, Shield, Crown, FileText, Loader2 } from 'lucide-react';

interface QuickSheet {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fileName: string;
  description: string;
  color: string;
}

const QUICK_SHEETS: QuickSheet[] = [
  {
    id: 'user',
    label: 'User Quick Reference',
    icon: User,
    fileName: 'user-announcement.txt',
    description: 'Essential guide for all agents',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    id: 'hr',
    label: 'HR Quick Reference',
    icon: Users,
    fileName: 'hr-announcement.txt',
    description: 'Leave management and profiles',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  {
    id: 'admin',
    label: 'Admin Quick Reference',
    icon: Shield,
    fileName: 'admin-announcement.txt',
    description: 'Content and question management',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  {
    id: 'super-admin',
    label: 'Super Admin Quick Reference',
    icon: Crown,
    fileName: 'super-admin-announcement.txt',
    description: 'Complete system control',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
];

// Parse content into sections for accordion
function parseContentToSections(content: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  const lines = content.split('\n');
  
  let currentSection = { title: '', content: '' };
  
  for (const line of lines) {
    // Match section headers like "=== SECTION NAME ===" or "--- Section Name ---"
    const sectionMatch = line.match(/^[=\-]{3,}\s*(.+?)\s*[=\-]{3,}$/);
    
    if (sectionMatch) {
      // Save previous section if it has content
      if (currentSection.title && currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentSection = { title: sectionMatch[1].trim(), content: '' };
    } else if (currentSection.title) {
      currentSection.content += line + '\n';
    } else {
      // Before first section, treat as intro
      if (!sections.find(s => s.title === 'Overview')) {
        if (line.trim()) {
          currentSection = { title: 'Overview', content: line + '\n' };
        }
      } else {
        currentSection.content += line + '\n';
      }
    }
  }
  
  // Add last section
  if (currentSection.title && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections.length > 0 ? sections : [{ title: 'Content', content }];
}

export function QuickSheetsTab() {
  const { isAdmin, isHR, isSuperAdmin } = useAuth();
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);

  // Determine which sheets to show based on role
  const getVisibleSheets = (): QuickSheet[] => {
    if (isSuperAdmin) return QUICK_SHEETS;
    if (isAdmin) return QUICK_SHEETS.filter(s => s.id !== 'super-admin');
    if (isHR) return QUICK_SHEETS.filter(s => ['user', 'hr'].includes(s.id));
    return QUICK_SHEETS.filter(s => s.id === 'user');
  };

  const visibleSheets = getVisibleSheets();

  const loadContent = async (sheet: QuickSheet) => {
    if (content[sheet.id]) return;
    
    setLoading(prev => ({ ...prev, [sheet.id]: true }));
    try {
      const response = await fetch(`/announcements/${sheet.fileName}`);
      const text = await response.text();
      setContent(prev => ({ ...prev, [sheet.id]: text }));
    } catch (error) {
      console.error('Failed to load quick sheet:', error);
      setContent(prev => ({ ...prev, [sheet.id]: 'Failed to load content. Please try again.' }));
    } finally {
      setLoading(prev => ({ ...prev, [sheet.id]: false }));
    }
  };

  const handleDownload = (sheet: QuickSheet) => {
    const link = document.createElement('a');
    link.href = `/announcements/${sheet.fileName}`;
    link.download = sheet.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (sheet: QuickSheet) => {
    const printContent = content[sheet.id];
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${sheet.label}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
              pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; }
              h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
            </style>
          </head>
          <body>
            <h1>${sheet.label}</h1>
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSheetExpand = (sheetId: string) => {
    const sheet = QUICK_SHEETS.find(s => s.id === sheetId);
    if (sheet) {
      loadContent(sheet);
    }
    setExpandedSheet(prev => prev === sheetId ? null : sheetId);
  };

  // Load first sheet on mount
  useEffect(() => {
    const firstSheet = visibleSheets[0];
    if (firstSheet) {
      loadContent(firstSheet);
      setExpandedSheet(firstSheet.id);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Quick Reference Sheets</h2>
          <p className="text-sm text-muted-foreground">
            Role-specific guides for quick reference. Click to expand or download.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {visibleSheets.map((sheet) => {
          const sections = content[sheet.id] ? parseContentToSections(content[sheet.id]) : [];
          const isExpanded = expandedSheet === sheet.id;
          
          return (
            <Card 
              key={sheet.id} 
              className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${sheet.color}`}>
                      <sheet.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {sheet.label}
                        <Badge variant="outline" className="text-xs">
                          {sheet.id === 'user' ? 'All Users' : sheet.id.toUpperCase()}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{sheet.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(sheet)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(sheet)}
                      disabled={!content[sheet.id]}
                      className="flex items-center gap-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </Button>
                    <Button
                      variant={isExpanded ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => handleSheetExpand(sheet.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  {loading[sheet.id] ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sections.length > 0 ? (
                    <Accordion type="multiple" className="w-full" defaultValue={[sections[0]?.title]}>
                      {sections.map((section, index) => (
                        <AccordionItem key={index} value={section.title}>
                          <AccordionTrigger className="text-sm font-medium hover:no-underline">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {section.title}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg max-h-60 overflow-auto">
                              {section.content.trim()}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground">No content available.</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
