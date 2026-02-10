import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

interface PortalClockValue {
  /** Live EST Date object, updates every second */
  now: Date;
  /** Today's date in 'YYYY-MM-DD' format (EST) */
  todayEST: string;
  /** Current day key: 'mon', 'tue', etc. */
  currentDayKey: string;
  /** Minutes from midnight in EST (for schedule checks) */
  currentTimeMinutes: number;
}

const PortalClockContext = createContext<PortalClockValue | null>(null);

/**
 * Get the current time represented as an EST Date object.
 * This creates a Date whose local getters (getHours, etc.) return EST values.
 */
function getESTNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

export function PortalClockProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<Date>(getESTNow);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getESTNow());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo<PortalClockValue>(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayEST = `${year}-${month}-${day}`;

    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayKey = dayNames[now.getDay()];

    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    return { now, todayEST, currentDayKey, currentTimeMinutes };
  }, [now]);

  return (
    <PortalClockContext.Provider value={value}>
      {children}
    </PortalClockContext.Provider>
  );
}

export function usePortalClock(): PortalClockValue {
  const ctx = useContext(PortalClockContext);
  if (!ctx) {
    throw new Error('usePortalClock must be used within a PortalClockProvider');
  }
  return ctx;
}
