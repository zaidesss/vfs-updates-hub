import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { MessageTemplateContent } from '@/lib/playbookTypes';

interface MessageTemplateProps {
  template: MessageTemplateContent;
}

export function MessageTemplate({ template }: MessageTemplateProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-medium text-foreground">{template.label}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="p-4">
        <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans">
          {template.content}
        </pre>
      </div>
    </div>
  );
}
