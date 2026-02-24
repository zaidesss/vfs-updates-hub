import { useRef, useState } from 'react';
import { Paperclip, Upload, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileAttachmentButtonProps {
  onInsert: (markdownText: string) => void;
  onExtractText?: (text: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_EXTRACT_SIZE = 20 * 1024 * 1024; // 20 MB for text extraction
const ALLOWED_TYPES: Record<string, 'image' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
};

const EXTRACT_ACCEPT = '.txt,.pdf,.doc,.docx';

export function FileAttachmentButton({ 
  onInsert,
  onExtractText,
  disabled 
}: FileAttachmentButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    let insertedCount = 0;

    try {
      for (const file of files) {
        const fileType = ALLOWED_TYPES[file.type];
        if (!fileType) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not supported. Allowed: JPG, PNG, GIF, WebP, PDF, DOCX`,
            variant: 'destructive',
          });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the 5 MB limit.`,
            variant: 'destructive',
          });
          continue;
        }

        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}-${sanitizedName}`;

        const { data, error } = await supabase.storage
          .from('article-attachments')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
          toast({
            title: 'Upload failed',
            description: `${file.name}: ${error.message}`,
            variant: 'destructive',
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('article-attachments')
          .getPublicUrl(data.path);

        const markdown = fileType === 'image'
          ? `![${file.name}](${urlData.publicUrl})`
          : `[📎 ${file.name}](${urlData.publicUrl})`;
        
        onInsert(markdown);
        insertedCount++;
      }

      if (insertedCount > 0) {
        toast({
          title: 'Files inserted',
          description: `${insertedCount} file(s) uploaded and inserted into the body.`,
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExtractFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_EXTRACT_SIZE) {
      toast({
        title: 'File too large',
        description: `${file.name} exceeds the 20 MB limit for text extraction.`,
        variant: 'destructive',
      });
      if (extractInputRef.current) extractInputRef.current.value = '';
      return;
    }

    setIsExtracting(true);
    setIsOpen(false);

    try {
      // For .txt files, read directly in browser
      if (file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        if (onExtractText) {
          onExtractText(text);
        } else {
          onInsert(text);
        }
        toast({
          title: 'Text extracted',
          description: `Content from ${file.name} has been added to the body.`,
        });
      } else {
        // Send to edge function for PDF/DOCX parsing
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document-text`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to extract text');
        }

        if (data.text) {
          if (onExtractText) {
            onExtractText(data.text);
          } else {
            onInsert(data.text);
          }
          toast({
            title: 'Text extracted',
            description: `Content from ${file.name} has been added to the body.`,
          });
        } else {
          toast({
            title: 'No text found',
            description: 'The file appears to be empty or could not be read.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Extract error:', error);
      toast({
        title: 'Extraction failed',
        description: error instanceof Error ? error.message : 'Could not extract text from the file.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
      if (extractInputRef.current) extractInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={extractInputRef}
        type="file"
        accept={EXTRACT_ACCEPT}
        onChange={handleExtractFile}
        className="hidden"
      />
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading || isExtracting}
            className="h-7 text-xs gap-1.5"
            title="Attach files or extract text from documents"
          >
            {isUploading || isExtracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            {isExtracting ? 'Extracting...' : 'Attach'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            {/* Upload & Insert section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Upload & Insert</h4>
                <span className="text-xs text-muted-foreground">Max 5 MB each</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isExtracting}
                className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center hover:border-muted-foreground/50 transition-colors"
              >
                <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">
                  Upload files as attachments
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  JPG, PNG, GIF, WebP, PDF, DOCX
                </p>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t" />
            </div>

            {/* Extract Text section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Extract Text
                </h4>
                <span className="text-xs text-muted-foreground">Max 20 MB</span>
              </div>
              <button
                type="button"
                onClick={() => extractInputRef.current?.click()}
                disabled={isUploading || isExtracting}
                className="w-full border-2 border-dashed border-primary/25 rounded-lg p-3 text-center hover:border-primary/50 transition-colors bg-primary/5"
              >
                <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-sm text-primary">
                  Import text content from a file
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  TXT, PDF, DOCX — text is added to the body for AI formatting
                </p>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
