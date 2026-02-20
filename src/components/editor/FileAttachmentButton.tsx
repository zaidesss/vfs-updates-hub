import { useRef, useState } from 'react';
import { Paperclip, Upload, Loader2 } from 'lucide-react';
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
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, 'image' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
};

export function FileAttachmentButton({ 
  onInsert,
  disabled 
}: FileAttachmentButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

        // Insert markdown directly into the editor
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
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            className="h-7 text-xs gap-1.5"
            title="Attach files — images and documents are inserted directly into the body"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            Attach
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Upload & Insert</h4>
              <span className="text-xs text-muted-foreground">Max 5 MB each</span>
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload files
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                JPG, PNG, GIF, WebP, PDF, DOCX
              </p>
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Files are uploaded and inserted as markdown into the body automatically.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
