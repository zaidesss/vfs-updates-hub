import { AlertTriangle, Info, CheckCircle, Lightbulb } from 'lucide-react';
import { CalloutContent } from '@/lib/playbookTypes';
import { cn } from '@/lib/utils';

const VARIANTS = {
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800 dark:text-blue-200',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800 dark:text-green-200',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-800 dark:text-purple-200',
  },
};

interface CalloutBoxProps {
  callout: CalloutContent;
}

export function CalloutBox({ callout }: CalloutBoxProps) {
  const config = VARIANTS[callout.variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-xl border',
        config.bg,
        config.border
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} />
      <div className="space-y-1">
        {callout.title && (
          <p className={cn('font-semibold text-sm', config.titleColor)}>
            {callout.title}
          </p>
        )}
        <p className="text-sm text-foreground/80">{callout.text}</p>
      </div>
    </div>
  );
}
