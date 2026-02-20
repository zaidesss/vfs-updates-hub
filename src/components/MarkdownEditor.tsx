import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { PlaybookPage } from './playbook/PlaybookPage';
import { PlaybookArticle } from '@/lib/playbookTypes';
import { Wand2, Loader2, Check, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FileAttachmentButton } from './editor/FileAttachmentButton';
import { ImageInsertButton, uploadImageFile } from './editor/ImageInsertButton';
import { RehostImagesButton } from './editor/RehostImagesButton';

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
  minHeight = 400,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [isFormatting, setIsFormatting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [formattedContent, setFormattedContent] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Insert text at cursor in the MDEditor textarea
  const insertAtCursor = useCallback((text: string) => {
    const textarea = editorContainerRef.current?.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = value.substring(0, start);
      const after = value.substring(end);
      onChange(before + text + after);
      // Restore cursor after insertion
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      });
    } else {
      // Fallback: append
      onChange(value + '\n' + text);
    }
  }, [value, onChange]);

  // Clipboard paste handler for images
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));

      // Check for pasted image URL text
      if (!imageItem) {
        const text = e.clipboardData?.getData('text/plain')?.trim();
        if (text) {
          const imageUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
          if (imageUrlRegex.test(text)) {
            e.preventDefault();
            insertAtCursor(`![image](${text})`);
            toast({ title: 'Image URL inserted', description: 'Pasted URL converted to markdown image.' });
            return;
          }
        }
        return;
      }

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;

      setIsPasting(true);
      try {
        const url = await uploadImageFile(file);
        if (url) {
          const name = file.name || 'pasted-image';
          insertAtCursor(`![${name}](${url})`);
          toast({ title: 'Image pasted', description: 'Image uploaded and inserted.' });
        } else {
          toast({ title: 'Paste failed', description: 'Could not upload pasted image.', variant: 'destructive' });
        }
      } finally {
        setIsPasting(false);
      }
    };

    container.addEventListener('paste', handlePaste);
    return () => container.removeEventListener('paste', handlePaste);
  }, [insertAtCursor, toast]);

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

    // Store original content before formatting
    setOriginalContent(value);
    setIsFormatting(true);
    
    try {
      const attachmentInfo: { name: string; url: string; type: string }[] = [];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/format-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ content: value, attachments: attachmentInfo }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to format content');
      }

      if (data.formattedContent) {
        // Store formatted content but don't apply yet
        setFormattedContent(data.formattedContent);
        // Temporarily show the formatted content in preview
        onChange(data.formattedContent);
        // Switch to preview and show approval buttons
        setMode('preview');
        setPendingApproval(true);
        toast({
          title: "Review formatted content",
          description: "Check the preview and choose to Accept or Edit.",
        });
      }
    } catch (error) {
      console.error('Format error:', error);
      setOriginalContent(null);
      toast({
        title: "Formatting failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const handleAccept = () => {
    // Keep the formatted content (already applied)
    setPendingApproval(false);
    setOriginalContent(null);
    setFormattedContent(null);
    toast({
      title: "Content accepted",
      description: "The formatted content has been applied.",
    });
  };

  const handleEdit = () => {
    // Revert to original content
    if (originalContent !== null) {
      onChange(originalContent);
    }
    setPendingApproval(false);
    setOriginalContent(null);
    setFormattedContent(null);
    setMode('write');
    toast({
      title: "Reverted to original",
      description: "You can continue editing your original content.",
    });
  };

  return (
    <div ref={editorContainerRef} className={cn("relative border rounded-lg overflow-hidden", className)} data-color-mode="light">
      {isPasting && (
        <div className="absolute inset-0 z-50 bg-background/60 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading pasted image...
          </div>
        </div>
      )}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'write' | 'preview')}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-2">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger 
              value="write" 
              className="text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              disabled={pendingApproval}
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
          <div className="flex flex-wrap items-center gap-2">
            <ImageInsertButton
              onInsert={insertAtCursor}
              disabled={isFormatting || pendingApproval}
            />
            <FileAttachmentButton
              onInsert={insertAtCursor}
              disabled={isFormatting || pendingApproval}
            />
            <RehostImagesButton
              content={value}
              onContentChange={onChange}
              disabled={isFormatting || pendingApproval}
            />
            {pendingApproval ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="h-7 text-xs gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAccept}
                  className="h-7 text-xs gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </Button>
              </>
            ) : (
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
            )}
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
