import { useState, useMemo } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PlaybookPage } from './playbook/PlaybookPage';
import { PlaybookArticle } from '@/lib/playbookTypes';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write your article content here...\n\nSupports **markdown** formatting:\n- # Heading 1\n- ## Heading 2\n- **bold** and *italic*\n- Lists, tables, code blocks\n- > Blockquotes for messaging templates",
  className,
  minHeight = 400
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [isFormatting, setIsFormatting] = useState(false);
  const { toast } = useToast();

  // Parse content as Playbook JSON if possible
  const playbookData = useMemo<PlaybookArticle | null>(() => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed.title && parsed.sections && Array.isArray(parsed.sections)) {
        return parsed as PlaybookArticle;
      }
    } catch {
      // Not JSON, will render as markdown
    }
    return null;
  }, [value]);

  const handleAIFormat = async () => {
    if (!value.trim()) {
      toast({
        title: "Nothing to format",
        description: "Please add some content first.",
        variant: "destructive",
      });
      return;
    }

    setIsFormatting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/format-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ content: value }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to format content');
      }

      if (data.formattedContent) {
        onChange(data.formattedContent);
        // Auto-switch to Preview mode after formatting
        setMode('preview');
        toast({
          title: "Content formatted",
          description: "Your article has been rewritten for clarity. Check the preview!",
        });
      }
    } catch (error) {
      console.error('Format error:', error);
      toast({
        title: "Formatting failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)} data-color-mode="light">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'write' | 'preview')}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-2">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger 
              value="write" 
              className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Write
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Preview
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIFormat}
              disabled={isFormatting || !value.trim()}
              className="h-7 text-xs gap-1.5"
            >
              {isFormatting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              AI Format
            </Button>
            <span className="text-xs text-muted-foreground">
              Supports Markdown
            </span>
          </div>
        </div>

        <TabsContent value="write" className="m-0">
          <MDEditor
            value={value}
            onChange={(v) => onChange(v || '')}
            preview="edit"
            hideToolbar={false}
            height={minHeight}
            textareaProps={{
              placeholder,
            }}
            className="!border-0 !shadow-none"
            style={{
              backgroundColor: 'transparent',
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div 
            className="overflow-auto bg-background"
            style={{ minHeight: minHeight }}
          >
            {value ? (
              playbookData ? (
                <PlaybookPage article={playbookData} />
              ) : (
                <div className="p-4">
                  <MarkdownRenderer content={value} showToc={false} />
                </div>
              )
            ) : (
              <p className="p-4 text-muted-foreground italic">Nothing to preview yet...</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
