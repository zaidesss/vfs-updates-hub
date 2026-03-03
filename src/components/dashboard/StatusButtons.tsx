import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, Coffee, GraduationCap, Loader2, RotateCcw, User, Clock } from 'lucide-react';
import type { ProfileStatus, EventType } from '@/lib/agentDashboardApi';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { BreakConfirmDialog } from './BreakConfirmDialog';
import { NextShiftDialog } from './NextShiftDialog';

interface StatusButtonsProps {
  currentStatus: ProfileStatus;
  isLoading: boolean;
  onStatusChange: (eventType: EventType) => Promise<void>;
  statusSince?: string | null;
  bioTimeRemaining?: number | null;
  bioAllowance?: number | null;
  onRestartExceeded?: () => void;
  onBioExceeded?: () => void;
  otEnabled?: boolean;
  shiftSchedule?: string | null;
  breakSchedule?: string | null;
  profileId?: string;
  agentEmail?: string;
}

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
  otEnabled = false,
  shiftSchedule = null,
  breakSchedule = null,
  profileId,
  agentEmail,
}: StatusButtonsProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [showNextShiftDialog, setShowNextShiftDialog] = useState(false);
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

  // OT status locks all other buttons
  const isOnOT = currentStatus === 'ON_OT';

  // Consolidated Login/Logout toggle
  const isLoggedOut = currentStatus === 'LOGGED_OUT';
  const isLoggedIn = currentStatus === 'LOGGED_IN';
  const loginLogoutEnabled = !isOnOT && (isLoggedOut || isLoggedIn);
  const loginLogoutEvent: EventType = isLoggedOut ? 'LOGIN' : 'LOGOUT';

  // Consolidated Break toggle
  const isOnBreak = currentStatus === 'ON_BREAK';
  const breakEnabled = !isOnOT && (isLoggedIn || isOnBreak);
  const breakEvent: EventType = isOnBreak ? 'BREAK_OUT' : 'BREAK_IN';

  // Coaching is a toggle button
  const isCoaching = currentStatus === 'COACHING';
  const coachingEnabled = !isOnOT && (isLoggedIn || isCoaching);

  // Device Restart is a toggle button with timer
  const isRestarting = currentStatus === 'RESTARTING';
  const restartEnabled = !isOnOT && (isLoggedIn || isRestarting);
  const restartTimeRemaining = DEVICE_RESTART_LIMIT_SECONDS - restartElapsed;

  // Bio Break is a toggle button with consumable timer
  const isOnBio = currentStatus === 'ON_BIO';
  const bioEnabled = !isOnOT && ((isLoggedIn && bioRemaining > 0) || isOnBio);
  const hasBioAllowance = bioAllowance !== null && bioAllowance > 0;

  // OT button (only shown when ot_enabled)
  const otButtonEnabled = isLoggedIn || isOnOT;

  return (
    <div className="flex flex-wrap gap-3">
      {/* Consolidated Login/Logout Button */}
      <Button
        variant={isLoggedOut ? 'default' : isLoggedIn ? 'destructive' : 'secondary'}
        disabled={!loginLogoutEnabled || isLoading}
        onClick={() => {
          if (!isLoggedOut) {
            // Logout: show confirmation dialog
            setShowLogoutConfirm(true);
          } else {
            handleClick(loginLogoutEvent);
          }
        }}
        className={cn(
          'min-w-[100px] sm:min-w-[110px]',
          !loginLogoutEnabled && 'opacity-50'
        )}
      >
        {loadingEvent === 'LOGIN' || loadingEvent === 'LOGOUT' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isLoggedOut ? (
          <LogIn className="h-4 w-4 mr-2" />
        ) : (
          <LogOut className="h-4 w-4 mr-2" />
        )}
        <span className="hidden sm:inline">{isLoggedOut ? 'Log In' : 'Log Out'}</span>
        <span className="sm:hidden">{isLoggedOut ? 'In' : 'Out'}</span>
      </Button>

      {/* Consolidated Break Button */}
      <Button
        variant="outline"
        disabled={!breakEnabled || isLoading}
        onClick={() => {
          if (!isOnBreak) {
            setShowBreakConfirm(true);
          } else {
            handleClick(breakEvent);
          }
        }}
        className={cn(
          'min-w-[100px] sm:min-w-[110px]',
          !breakEnabled && 'opacity-50',
          isOnBreak && 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950',
          !isOnBreak && breakEnabled && 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
        )}
      >
        {loadingEvent === 'BREAK_IN' || loadingEvent === 'BREAK_OUT' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Coffee className="h-4 w-4 mr-2" />
        )}
        <span className="hidden sm:inline">{isOnBreak ? 'Break Out' : 'Break In'}</span>
        <span className="sm:hidden">{isOnBreak ? 'Out' : 'Break'}</span>
      </Button>

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

      {/* OT Login/Logout Button - only shown when ot_enabled is true */}
      {otEnabled && (
        <Button
          variant={isOnOT ? 'default' : 'outline'}
          disabled={!otButtonEnabled || isLoading}
          onClick={() => handleClick(isOnOT ? 'OT_LOGOUT' : 'OT_LOGIN')}
          className={cn(
            'min-w-[100px] sm:min-w-[120px]',
            !otButtonEnabled && 'opacity-50',
            isOnOT && 'bg-purple-600 hover:bg-purple-700',
            !isOnOT && otButtonEnabled && 'border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950'
          )}
        >
          {loadingEvent === 'OT_LOGIN' || loadingEvent === 'OT_LOGOUT' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          <span className="hidden sm:inline">{isOnOT ? 'OT Logout' : 'OT Login'}</span>
          <span className="sm:hidden">{isOnOT ? 'End OT' : 'OT'}</span>
        </Button>
      )}
      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          setShowNextShiftDialog(true);
        }}
        shiftSchedule={shiftSchedule}
      />
      {/* Next Shift Acknowledgment Dialog */}
      {profileId && (
        <NextShiftDialog
          open={showNextShiftDialog}
          onOpenChange={setShowNextShiftDialog}
          onAcknowledge={() => {
            setShowNextShiftDialog(false);
            handleClick('LOGOUT');
          }}
          profileId={profileId}
          agentEmail={agentEmail}
        />
      )}
      {/* Break Confirmation Dialog */}
      <BreakConfirmDialog
        open={showBreakConfirm}
        onOpenChange={setShowBreakConfirm}
        onConfirm={() => {
          setShowBreakConfirm(false);
          handleClick('BREAK_IN');
        }}
        breakSchedule={breakSchedule}
      />
    </div>
  );
}
