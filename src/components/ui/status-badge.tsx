import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'destructive' | 'info' | 'default' | 'muted';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-success/12 text-success border-success/20 dark:bg-success/15 dark:text-success dark:border-success/25',
  warning: 'bg-warning/12 text-warning border-warning/20 dark:bg-warning/15 dark:text-warning dark:border-warning/25',
  destructive: 'bg-destructive/12 text-destructive border-destructive/20 dark:bg-destructive/15 dark:text-destructive dark:border-destructive/25',
  info: 'bg-info/12 text-info border-info/20 dark:bg-info/15 dark:text-info dark:border-info/25',
  default: 'bg-primary/12 text-primary border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/25',
  muted: 'bg-muted text-muted-foreground border-border',
};

const dotStyles: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  default: 'bg-primary',
  muted: 'bg-muted-foreground',
};

export function StatusBadge({ variant = 'default', children, className, dot }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}
