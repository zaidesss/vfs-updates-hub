import { useRef, useState, useEffect } from 'react';
import { ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GuideImagePlaceholderProps {
  description: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
  imageKey?: string;
}

export function GuideImagePlaceholder({ description, className, aspectRatio = 'video', imageKey }: GuideImagePlaceholderProps) {
  const ratioClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[21/9]',
  }[aspectRatio];

  const { isAdmin, isSuperAdmin } = useAuth();
  const canUpload = isAdmin || isSuperAdmin;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(!!imageKey);

  // Derive a stable key from imageKey or description
  const resolvedKey = imageKey || description.slice(0, 100).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  useEffect(() => {
    if (!resolvedKey) return;
    let mounted = true;

    const fetchImage = async () => {
      const { data } = await supabase
        .from('guide_images')
        .select('image_url')
        .eq('image_key', resolvedKey)
        .maybeSingle();

      if (mounted) {
        setImageUrl(data?.image_url || null);
        setIsLoading(false);
      }
    };

    fetchImage();
    return () => { mounted = false; };
  }, [resolvedKey]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5 MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${resolvedKey}/${timestamp}-${sanitized}`;

      const { data, error } = await supabase.storage
        .from('guide-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('guide-images')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Upsert into guide_images table
      const { error: dbError } = await supabase
        .from('guide_images' as any)
        .upsert(
          { image_key: resolvedKey, image_url: publicUrl, uploaded_by: 'admin' } as any,
          { onConflict: 'image_key' }
        );

      if (dbError) throw dbError;

      setImageUrl(publicUrl);
      toast({ title: 'Image uploaded', description: 'Guide image has been updated.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    try {
      await supabase
        .from('guide_images' as any)
        .delete()
        .eq('image_key', resolvedKey);
      setImageUrl(null);
      toast({ title: 'Image removed' });
    } catch {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className={cn('relative rounded-lg bg-muted/30 flex items-center justify-center my-4', ratioClass, className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  // If image exists, show it
  if (imageUrl) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden my-4 group', className)}>
        <img src={imageUrl} alt={description} className="w-full h-auto rounded-lg border" />
        {canUpload && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 rounded-md bg-background/80 backdrop-blur border flex items-center justify-center hover:bg-background"
              title="Replace image"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleRemove}
              className="h-7 w-7 rounded-md bg-background/80 backdrop-blur border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Placeholder state
  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center gap-2 p-6 my-4',
        canUpload && 'cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/50 transition-colors',
        ratioClass,
        className
      )}
      onClick={canUpload ? () => fileInputRef.current?.click() : undefined}
    >
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleUpload} className="hidden" />
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
      ) : (
        <>
          {canUpload ? (
            <Upload className="h-8 w-8 text-muted-foreground/40" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
        {canUpload ? `📸 Click to upload: ${description}` : `📸 ${description}`}
      </p>
    </div>
  );
}
