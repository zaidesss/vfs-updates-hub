import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './MarkdownRenderer';

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
          <span className="text-xs text-muted-foreground">
            Supports Markdown
          </span>
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
            className="p-4 overflow-auto bg-background"
            style={{ minHeight: minHeight }}
          >
            {value ? (
              <MarkdownRenderer content={value} showToc={false} />
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview yet...</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
