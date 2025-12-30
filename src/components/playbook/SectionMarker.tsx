import { SECTION_COLORS } from '@/lib/playbookTypes';
import { cn } from '@/lib/utils';

interface SectionMarkerProps {
  letter: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SectionMarker({ letter, size = 'md', className }: SectionMarkerProps) {
  const color = SECTION_COLORS[letter.toUpperCase()] || 'bg-slate-500';
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-14 w-14 text-xl',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold shadow-md',
        color,
        sizeClasses[size],
        className
      )}
    >
      {letter.toUpperCase()}
    </div>
  );
}
