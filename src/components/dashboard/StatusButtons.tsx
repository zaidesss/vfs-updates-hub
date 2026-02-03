import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, Coffee, GraduationCap, Loader2, RotateCcw, User } from 'lucide-react';
import type { ProfileStatus, EventType } from '@/lib/agentDashboardApi';

interface StatusButtonsProps {
  currentStatus: ProfileStatus;
  isLoading: boolean;
  onStatusChange: (eventType: EventType) => Promise<void>;
  statusSince?: string | null;
  bioTimeRemaining?: number | null; // seconds remaining for bio
  bioAllowance?: number | null; // total bio allowance in seconds
  onRestartExceeded?: () => void; // callback when restart exceeds 5 mins
  onBioExceeded?: () => void; // callback when bio time is depleted
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

const DEVICE_RESTART_LIMIT_SECONDS = 5 * 60; // 5 minutes

function formatTimer(seconds: number): string {
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StatusButtons({ 
  currentStatus, 
  isLoading, 
  onStatusChange,
  statusSince,
  bioTimeRemaining = null,
  bioAllowance = null,
  onRestartExceeded,
  onBioExceeded,
}: StatusButtonsProps) {
  const [loadingEvent, setLoadingEvent] = useState<EventType | null>(null);
  
  // Device Restart timer state
  const [restartElapsed, setRestartElapsed] = useState(0);
  const [restartExceeded, setRestartExceeded] = useState(false);
  const restartExceededNotified = useRef(false);
  
  // Bio Break timer state
  const [bioRemaining, setBioRemaining] = useState<number>(bioTimeRemaining ?? 0);
  const [bioExceeded, setBioExceeded] = useState(false);
  const bioExceededNotified = useRef(false);

  // Update bio remaining when props change
  useEffect(() => {
    if (bioTimeRemaining !== null) {
      setBioRemaining(bioTimeRemaining);
    }
  }, [bioTimeRemaining]);

  // Device Restart timer effect
  useEffect(() => {
    if (currentStatus === 'RESTARTING' && statusSince) {
      restartExceededNotified.current = false;
      const startTime = new Date(statusSince).getTime();
      
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRestartElapsed(elapsed);
        
        // Check if exceeded 5 minutes
        if (elapsed >= DEVICE_RESTART_LIMIT_SECONDS) {
          setRestartExceeded(true);
          if (!restartExceededNotified.current) {
            restartExceededNotified.current = true;
            onRestartExceeded?.();
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setRestartElapsed(0);
      setRestartExceeded(false);
    }
  }, [currentStatus, statusSince, onRestartExceeded]);

  // Bio Break timer effect
  useEffect(() => {
    if (currentStatus === 'ON_BIO' && statusSince) {
      bioExceededNotified.current = false;
      const startTime = new Date(statusSince).getTime();
      const initialRemaining = bioTimeRemaining ?? 0;
      
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = initialRemaining - elapsed;
        setBioRemaining(remaining);
        
        // Check if bio time depleted
        if (remaining <= 0) {
          setBioExceeded(true);
          if (!bioExceededNotified.current) {
            bioExceededNotified.current = true;
            onBioExceeded?.();
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentStatus, statusSince, bioTimeRemaining, onBioExceeded]);

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

  // Device Restart is a toggle button with timer
  const isRestarting = currentStatus === 'RESTARTING';
  const restartEnabled = currentStatus === 'LOGGED_IN' || currentStatus === 'RESTARTING';
  const restartTimeRemaining = DEVICE_RESTART_LIMIT_SECONDS - restartElapsed;

  // Bio Break is a toggle button with consumable timer
  const isOnBio = currentStatus === 'ON_BIO';
  const bioEnabled = (currentStatus === 'LOGGED_IN' && bioRemaining > 0) || currentStatus === 'ON_BIO';
  const hasBioAllowance = bioAllowance !== null && bioAllowance > 0;

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
            className={cn('min-w-[100px] sm:min-w-[110px]', className)}
          >
            {isButtonLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <config.icon className="h-4 w-4 mr-2" />
            )}
            <span className="hidden sm:inline">{showActiveLabel ? config.activeLabel : config.label}</span>
            <span className="sm:hidden">{config.label.split(' ')[0]}</span>
          </Button>
        );
      })}

      {/* Coaching Toggle Button */}
      <Button
        variant={isCoaching ? 'default' : 'outline'}
        disabled={!coachingEnabled || isLoading}
        onClick={() => handleClick(isCoaching ? 'COACHING_END' : 'COACHING_START')}
        className={cn(
          'min-w-[100px] sm:min-w-[130px]',
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
        <span className="hidden sm:inline">{isCoaching ? 'End Coaching' : 'Coaching'}</span>
        <span className="sm:hidden">{isCoaching ? 'End' : 'Coach'}</span>
      </Button>

      {/* Device Restart Toggle Button with Timer */}
      <Button
        variant={isRestarting ? 'default' : 'outline'}
        disabled={!restartEnabled || isLoading}
        onClick={() => handleClick(isRestarting ? 'DEVICE_RESTART_END' : 'DEVICE_RESTART_START')}
        className={cn(
          'min-w-[100px] sm:min-w-[160px]',
          !restartEnabled && 'opacity-50',
          isRestarting && !restartExceeded && 'bg-orange-600 hover:bg-orange-700',
          isRestarting && restartExceeded && 'bg-red-600 hover:bg-red-700 animate-pulse',
          !isRestarting && restartEnabled && 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'
        )}
      >
        {loadingEvent === 'DEVICE_RESTART_START' || loadingEvent === 'DEVICE_RESTART_END' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4 mr-2" />
        )}
        {isRestarting ? (
          <>
            <span className="hidden sm:inline">
              End Restart ({formatTimer(restartTimeRemaining)})
            </span>
            <span className="sm:hidden">
              {formatTimer(restartTimeRemaining)}
            </span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Device Restart</span>
            <span className="sm:hidden">Restart</span>
          </>
        )}
      </Button>

      {/* Bio Break Toggle Button with Consumable Timer */}
      {hasBioAllowance && (
        <Button
          variant={isOnBio ? 'default' : 'outline'}
          disabled={!bioEnabled || isLoading}
          onClick={() => handleClick(isOnBio ? 'BIO_END' : 'BIO_START')}
          className={cn(
            'min-w-[100px] sm:min-w-[140px]',
            !bioEnabled && 'opacity-50',
            isOnBio && !bioExceeded && 'bg-cyan-600 hover:bg-cyan-700',
            isOnBio && bioExceeded && 'bg-red-600 hover:bg-red-700 animate-pulse',
            !isOnBio && bioEnabled && 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950',
            !isOnBio && !bioEnabled && bioRemaining <= 0 && 'border-gray-300 text-gray-400'
          )}
        >
          {loadingEvent === 'BIO_START' || loadingEvent === 'BIO_END' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <User className="h-4 w-4 mr-2" />
          )}
          {isOnBio ? (
            <>
              <span className="hidden sm:inline">
                End Bio ({formatTimer(Math.max(0, bioRemaining))})
              </span>
              <span className="sm:hidden">
                {formatTimer(Math.max(0, bioRemaining))}
              </span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                Bio {bioRemaining > 0 ? `(${formatTimer(bioRemaining)} left)` : '(0:00)'}
              </span>
              <span className="sm:hidden">
                Bio {bioRemaining > 0 ? formatTimer(bioRemaining) : '0:00'}
              </span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
