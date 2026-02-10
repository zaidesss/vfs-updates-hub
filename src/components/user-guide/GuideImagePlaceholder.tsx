import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideImagePlaceholderProps {
  description: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
}

export function GuideImagePlaceholder({ description, className, aspectRatio = 'video' }: GuideImagePlaceholderProps) {
  const ratioClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[21/9]',
  }[aspectRatio];

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center gap-2 p-6 my-4',
        ratioClass,
        className
      )}
    >
      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
        📸 {description}
      </p>
    </div>
  );
}
