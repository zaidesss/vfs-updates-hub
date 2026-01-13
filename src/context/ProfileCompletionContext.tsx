import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useDemoTour } from '@/context/DemoTourContext';

interface ProfileCompletionContextType {
  isProfileComplete: boolean;
  isLoading: boolean;
  showProfileModal: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  markProfileComplete: () => void;
  refreshProfileStatus: () => Promise<void>;
}

const ProfileCompletionContext = createContext<ProfileCompletionContextType | undefined>(undefined);

// Required fields for profile completion
const REQUIRED_FIELDS = ['full_name', 'phone_number', 'birthday', 'home_address'] as const;

export function ProfileCompletionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { hasSeenDemo, isLoading: isDemoLoading, showTour } = useDemoTour();
  
  const [isProfileComplete, setIsProfileComplete] = useState(true); // Default to true to avoid flash
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const checkProfileCompletion = async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('full_name, phone_number, birthday, home_address')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Error checking profile completion:', error);
        // On error, assume complete to avoid blocking
        setIsProfileComplete(true);
      } else if (!data) {
        // No profile exists
        setIsProfileComplete(false);
      } else {
        // Check if all required fields are filled
        const isComplete = REQUIRED_FIELDS.every(field => {
          const value = data[field];
          return value !== null && value !== undefined && value.toString().trim() !== '';
        });
        setIsProfileComplete(isComplete);
      }
    } catch (err) {
      console.error('Failed to check profile completion:', err);
      setIsProfileComplete(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Check profile completion when user changes
  useEffect(() => {
    checkProfileCompletion();
  }, [user?.email]);

  // Show profile modal after demo tour is complete and profile is incomplete
  useEffect(() => {
    if (!isDemoLoading && !isLoading && hasSeenDemo && !showTour && !isProfileComplete) {
      setShowProfileModal(true);
    }
  }, [isDemoLoading, isLoading, hasSeenDemo, showTour, isProfileComplete]);

  const openProfileModal = () => {
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    // Only allow closing if profile is complete
    if (isProfileComplete) {
      setShowProfileModal(false);
    }
  };

  const markProfileComplete = () => {
    setIsProfileComplete(true);
    setShowProfileModal(false);
  };

  const refreshProfileStatus = async () => {
    await checkProfileCompletion();
  };

  return (
    <ProfileCompletionContext.Provider value={{ 
      isProfileComplete, 
      isLoading, 
      showProfileModal, 
      openProfileModal, 
      closeProfileModal, 
      markProfileComplete,
      refreshProfileStatus
    }}>
      {children}
    </ProfileCompletionContext.Provider>
  );
}

export function useProfileCompletion() {
  const context = useContext(ProfileCompletionContext);
  if (context === undefined) {
    throw new Error('useProfileCompletion must be used within a ProfileCompletionProvider');
  }
  return context;
}
