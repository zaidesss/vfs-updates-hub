import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface DemoTourContextType {
  hasSeenDemo: boolean;
  isLoading: boolean;
  showTour: boolean;
  openTour: () => void;
  closeTour: () => void;
  completeTour: () => void;
}

const DemoTourContext = createContext<DemoTourContextType | undefined>(undefined);

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hasSeenDemo, setHasSeenDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  // Check if user has seen demo
  useEffect(() => {
    const checkDemoStatus = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('demo_guide_views')
          .select('seen_at')
          .eq('user_email', user.email.toLowerCase())
          .maybeSingle();

        if (error) {
          console.error('Error checking demo status:', error);
          // On error, assume they've seen it to avoid blocking
          setHasSeenDemo(true);
        } else if (data) {
          setHasSeenDemo(true);
        } else {
          // First time user - show the tour
          setHasSeenDemo(false);
          setShowTour(true);
        }
      } catch (err) {
        console.error('Failed to check demo status:', err);
        setHasSeenDemo(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkDemoStatus();
  }, [user?.email]);

  const openTour = () => {
    setShowTour(true);
  };

  const closeTour = () => {
    setShowTour(false);
  };

  const completeTour = () => {
    setHasSeenDemo(true);
    setShowTour(false);
  };

  return (
    <DemoTourContext.Provider value={{ 
      hasSeenDemo, 
      isLoading, 
      showTour, 
      openTour, 
      closeTour, 
      completeTour 
    }}>
      {children}
    </DemoTourContext.Provider>
  );
}

export function useDemoTour() {
  const context = useContext(DemoTourContext);
  if (context === undefined) {
    throw new Error('useDemoTour must be used within a DemoTourProvider');
  }
  return context;
}
