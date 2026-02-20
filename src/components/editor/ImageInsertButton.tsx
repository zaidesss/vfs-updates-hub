import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Link, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageInsertButtonProps {
  onInsert: (markdownText: string) => void;
  disabled?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ImageInsertButton({ onInsert, disabled }: ImageInsertButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: 'Invalid image type', description: 'Only JPG, PNG, GIF, and WebP are allowed.', variant: 'destructive' });
      return null;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'Image too large', description: 'Image must be under 5 MB.', variant: 'destructive' });
      return null;
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}-${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from('article-attachments')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('article-attachments')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        onInsert(`![${file.name}](${url})`);
        toast({ title: 'Image inserted', description: file.name });
        setIsOpen(false);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUrlInsert = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) return;

    // Basic URL validation
    try {
      new URL(trimmed);
    } catch {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL.', variant: 'destructive' });
      return;
    }

    onInsert(`![image](${trimmed})`);
    toast({ title: 'Image URL inserted' });
    setUrlValue('');
    setIsOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
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
            title="Insert image — upload a file or paste a URL"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            Image
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Insert Image</h4>

            {/* Upload file option */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload from computer
            </Button>

            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Paste URL option */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link className="h-3.5 w-3.5" />
                Paste image URL
              </div>
              <div className="flex gap-2">
                <Input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleUrlInsert();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs px-3"
                  disabled={!urlValue.trim()}
                  onClick={handleUrlInsert}
                >
                  Insert
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

// Shared upload helper for paste events
export async function uploadImageFile(file: File): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
  if (file.size > MAX_IMAGE_SIZE) return null;

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${timestamp}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('article-attachments')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) return null;

  const { data: urlData } = supabase.storage
    .from('article-attachments')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
