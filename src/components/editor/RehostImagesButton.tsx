import { useState, useMemo } from 'react';
import { RefreshCw, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface RehostImagesButtonProps {
  content: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
  storageHost?: string;
}

// Match markdown image URLs: ![alt](url)
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function RehostImagesButton({
  content,
  onContentChange,
  disabled,
  storageHost = 'supabase.co/storage',
}: RehostImagesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Find external image URLs in markdown
  const externalImages = useMemo(() => {
    const images: { alt: string; url: string }[] = [];
    let match;
    const regex = new RegExp(IMAGE_REGEX.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      const url = match[2];
      // Skip if it's already hosted on our storage
      if (!url.includes(storageHost)) {
        images.push({ alt: match[1], url });
      }
    }
    // Deduplicate by URL
    return images.filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);
  }, [content, storageHost]);

  const handleOpen = () => {
    if (externalImages.length === 0) {
      toast({
        title: 'No external images found',
        description: 'All images in the body are already hosted on your storage, or there are no ![image](url) patterns to re-host.',
      });
      return;
    }
    setSelected(new Set(externalImages.map(i => i.url)));
    setCompleted(new Set());
    setIsOpen(true);
  };

  const toggleSelection = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleRehost = async () => {
    setIsProcessing(true);
    let updatedContent = content;
    let successCount = 0;

    for (const url of selected) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rehost-image`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ imageUrl: url }),
          }
        );

        const data = await response.json();
        if (data.newUrl) {
          // Replace all occurrences of this URL in content
          updatedContent = updatedContent.split(url).join(data.newUrl);
          setCompleted(prev => new Set(prev).add(url));
          successCount++;
        }
      } catch (err) {
        console.error('Rehost failed for:', url, err);
      }
    }

    onContentChange(updatedContent);
    setIsProcessing(false);

    toast({
      title: 'Re-hosting complete',
      description: `${successCount} of ${selected.size} image(s) re-hosted successfully.`,
    });

    if (successCount === selected.size) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={handleOpen}
        className="h-7 text-xs gap-1.5 relative"
        title="Re-host external images to your own storage so they don't break if the source changes"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Re-host
        {externalImages.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] text-white flex items-center justify-center font-medium">
            {externalImages.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Re-host External Images</DialogTitle>
            <DialogDescription>
              Select external images to re-upload to your own storage. This prevents broken links if the source changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {externalImages.map((img) => (
              <label
                key={img.url}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(img.url)}
                  onCheckedChange={() => toggleSelection(img.url)}
                  disabled={isProcessing || completed.has(img.url)}
                />
                <div className="flex-1 min-w-0">
                  <div className="w-full h-20 rounded border bg-muted/30 overflow-hidden mb-1">
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{img.url}</p>
                  {completed.has(img.url) && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                      <Check className="h-3 w-3" /> Re-hosted
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleRehost} disabled={isProcessing || selected.size === 0}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Re-host ${selected.size} image(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
