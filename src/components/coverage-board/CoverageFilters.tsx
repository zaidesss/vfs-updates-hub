import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CoverageFiltersProps {
  showEffective: boolean;
  onToggleView: (effective: boolean) => void;
}

export function CoverageFilters({ showEffective, onToggleView }: CoverageFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">View:</span>
      <div className="flex rounded-md border border-border overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-none text-xs h-7 px-3',
            !showEffective && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
          )}
          onClick={() => onToggleView(false)}
        >
          Scheduled
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-none text-xs h-7 px-3 border-l border-border',
            showEffective && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
          )}
          onClick={() => onToggleView(true)}
        >
          Effective
        </Button>
      </div>
    </div>
  );
}
