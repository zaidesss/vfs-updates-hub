import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { List, ChevronRight, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showToc?: boolean;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function MarkdownRenderer({ content, className, showToc = true }: MarkdownRendererProps) {
  const [activeSection, setActiveSection] = useState<string>('');

  // Extract headings for TOC
  const tocItems = useMemo(() => {
    const headings: TocItem[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        headings.push({ id, text, level });
      }
    });
    
    return headings;
  }, [content]);

  // Track scroll position for active section
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = tocItems.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = headingElements.length - 1; i >= 0; i--) {
        const el = headingElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(tocItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasToc = showToc && tocItems.length > 2;

  return (
    <div className={cn("flex gap-8", className)}>
      {/* Table of Contents - Sidebar */}
      {hasToc && (
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <List className="h-4 w-4" />
              On this page
            </div>
            <nav className="space-y-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "block w-full text-left text-sm py-1 px-2 rounded transition-colors",
                    item.level === 1 && "font-medium",
                    item.level === 2 && "pl-4",
                    item.level === 3 && "pl-6 text-xs",
                    activeSection === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-1">
                    {activeSection === item.id && <ChevronRight className="h-3 w-3" />}
                    {item.text}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <article className={cn("flex-1 min-w-0", hasToc ? "" : "max-w-none")}>
        <div className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8 prose-h1:text-foreground
            prose-h2:text-xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8 prose-h2:text-foreground prose-h2:border-b-2 prose-h2:border-primary/20 prose-h2:pb-3
            prose-h3:text-lg prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-foreground
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground prose-strong:font-semibold
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2
            prose-li:text-muted-foreground prose-li:my-0
            prose-table:border-collapse prose-table:w-full prose-table:my-6
            prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
            prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-3 prose-td:text-muted-foreground
            prose-hr:border-border prose-hr:my-8
            prose-img:rounded-lg prose-img:shadow-md prose-img:my-4"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Add IDs to headings for TOC navigation
              h1: ({ children, ...props }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h1 id={id} {...props}>{children}</h1>;
              },
              h2: ({ children, ...props }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h2 id={id} {...props}>{children}</h2>;
              },
              h3: ({ children, ...props }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h3 id={id} {...props}>{children}</h3>;
              },
              // Styled inline code as pill badges
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-sm font-medium border border-primary/20"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              },
              // Custom blockquote for callouts/warnings
              blockquote: ({ children, ...props }) => {
                const text = String(children);
                const textLower = text.toLowerCase();
                
                // Detect callout type
                const isWarning = textLower.includes('warning') || textLower.includes('important') || textLower.includes('very important') || textLower.includes('⚠️');
                const isInfo = textLower.includes('note:') || textLower.includes('info:') || textLower.includes('ℹ️');
                const isSuccess = textLower.includes('✅') || textLower.includes('tip:');
                
                if (isWarning) {
                  return (
                    <div className="my-6 rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-amber-800 dark:text-amber-200 text-sm [&>p]:mb-0 [&>p]:text-amber-800 dark:[&>p]:text-amber-200">
                          {children}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (isInfo) {
                  return (
                    <div className="my-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-blue-800 dark:text-blue-200 text-sm [&>p]:mb-0 [&>p]:text-blue-800 dark:[&>p]:text-blue-200">
                          {children}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (isSuccess) {
                  return (
                    <div className="my-6 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-emerald-800 dark:text-emerald-200 text-sm [&>p]:mb-0 [&>p]:text-emerald-800 dark:[&>p]:text-emerald-200">
                          {children}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Default blockquote style for messaging templates
                return (
                  <blockquote
                    className="my-6 border-l-4 border-primary bg-primary/5 rounded-r-lg pl-4 pr-4 py-3 italic text-muted-foreground"
                    {...props}
                  >
                    {children}
                  </blockquote>
                );
              },
              // Links open in new tab
              a: ({ href, children, ...props }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  {...props}
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
