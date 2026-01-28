import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, Coffee, GraduationCap, Loader2 } from 'lucide-react';
import type { ProfileStatus, EventType } from '@/lib/agentDashboardApi';

interface StatusButtonsProps {
  currentStatus: ProfileStatus;
  isLoading: boolean;
  onStatusChange: (eventType: EventType) => Promise<void>;
}

interface ButtonConfig {
  eventType: EventType;
  label: string;
  activeLabel?: string;
  icon: typeof LogIn;
  getEnabled: (status: ProfileStatus) => boolean;
  getVariant: (status: ProfileStatus) => 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost';
  getClassName?: (status: ProfileStatus) => string;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
  {
    eventType: 'LOGIN',
    label: 'Log In',
    activeLabel: 'Logged In',
    icon: LogIn,
    getEnabled: (status) => status === 'LOGGED_OUT',
    getVariant: (status) => status === 'LOGGED_OUT' ? 'default' : 'secondary',
    getClassName: (status) => status !== 'LOGGED_OUT' ? 'opacity-50' : '',
  },
  {
    eventType: 'LOGOUT',
    label: 'Log Out',
    icon: LogOut,
    getEnabled: (status) => status === 'LOGGED_IN',
    getVariant: (status) => status === 'LOGGED_IN' ? 'destructive' : 'secondary',
    getClassName: (status) => status !== 'LOGGED_IN' ? 'opacity-50' : '',
  },
  {
    eventType: 'BREAK_IN',
    label: 'Break In',
    icon: Coffee,
    getEnabled: (status) => status === 'LOGGED_IN',
    getVariant: () => 'outline',
    getClassName: (status) => status !== 'LOGGED_IN' ? 'opacity-50' : 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950',
  },
  {
    eventType: 'BREAK_OUT',
    label: 'Break Out',
    icon: Coffee,
    getEnabled: (status) => status === 'ON_BREAK',
    getVariant: () => 'outline',
    getClassName: (status) => status !== 'ON_BREAK' ? 'opacity-50' : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950',
  },
];

export function StatusButtons({ currentStatus, isLoading, onStatusChange }: StatusButtonsProps) {
  const [loadingEvent, setLoadingEvent] = useState<EventType | null>(null);

  const handleClick = async (eventType: EventType) => {
    setLoadingEvent(eventType);
    try {
      await onStatusChange(eventType);
    } finally {
      setLoadingEvent(null);
    }
  };

  // Coaching is a toggle button
  const isCoaching = currentStatus === 'COACHING';
  const coachingEnabled = currentStatus === 'LOGGED_IN' || currentStatus === 'COACHING';

  return (
    <div className="flex flex-wrap gap-3">
      {BUTTON_CONFIGS.map((config) => {
        const enabled = config.getEnabled(currentStatus);
        const variant = config.getVariant(currentStatus);
        const className = config.getClassName?.(currentStatus) || '';
        const isButtonLoading = loadingEvent === config.eventType;
        const showActiveLabel = config.activeLabel && !enabled && currentStatus !== 'LOGGED_OUT';

        return (
          <Button
            key={config.eventType}
            variant={variant}
            disabled={!enabled || isLoading}
            onClick={() => handleClick(config.eventType)}
            className={cn('min-w-[110px]', className)}
          >
            {isButtonLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <config.icon className="h-4 w-4 mr-2" />
            )}
            {showActiveLabel ? config.activeLabel : config.label}
          </Button>
        );
      })}

      {/* Coaching Toggle Button */}
      <Button
        variant={isCoaching ? 'default' : 'outline'}
        disabled={!coachingEnabled || isLoading}
        onClick={() => handleClick(isCoaching ? 'COACHING_END' : 'COACHING_START')}
        className={cn(
          'min-w-[130px]',
          !coachingEnabled && 'opacity-50',
          isCoaching && 'bg-blue-600 hover:bg-blue-700',
          !isCoaching && coachingEnabled && 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
        )}
      >
        {loadingEvent === 'COACHING_START' || loadingEvent === 'COACHING_END' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <GraduationCap className="h-4 w-4 mr-2" />
        )}
        {isCoaching ? 'End Coaching' : 'Coaching'}
      </Button>
    </div>
  );
}
