import { useRef, useState } from 'react';
import { Paperclip, Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AttachedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document';
  size: number;
}

interface FileAttachmentButtonProps {
  attachments: AttachedFile[];
  onAttachmentsChange: (attachments: AttachedFile[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
} as const;

export function FileAttachmentButton({ 
  attachments, 
  onAttachmentsChange,
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

    try {
      const newAttachments: AttachedFile[] = [];

      for (const file of files) {
        // Validate file type
        const fileType = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];
        if (!fileType) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not a supported file type. Allowed: JPG, PNG, GIF, WebP, PDF, DOCX`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the 5 MB limit.`,
            variant: 'destructive',
          });
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}-${sanitizedName}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('article-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast({
            title: 'Upload failed',
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: 'destructive',
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('article-attachments')
          .getPublicUrl(data.path);

        newAttachments.push({
          id: data.path,
          name: file.name,
          url: urlData.publicUrl,
          type: fileType,
          size: file.size,
        });
      }

      if (newAttachments.length > 0) {
        onAttachmentsChange([...attachments, ...newAttachments]);
        toast({
          title: 'Files uploaded',
          description: `Successfully uploaded ${newAttachments.length} file(s).`,
        });
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (attachment: AttachedFile) => {
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('article-attachments')
        .remove([attachment.id]);

      if (error) {
        console.error('Delete error:', error);
      }

      // Remove from state
      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
      
      toast({
        title: 'File removed',
        description: `${attachment.name} has been removed.`,
      });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            className="h-7 text-xs gap-1.5 relative"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            Attach
            {attachments.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                {attachments.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Attachments</h4>
              <span className="text-xs text-muted-foreground">Max 5 MB each</span>
            </div>
            
            {/* Upload area */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload images or documents
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                JPG, PNG, GIF, WebP, PDF, DOCX
              </p>
            </button>

            {/* Attachment list */}
            {attachments.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    {attachment.type === 'image' ? (
                      <ImageIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => handleRemove(attachment)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Images will be embedded or grouped in a gallery based on context.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
