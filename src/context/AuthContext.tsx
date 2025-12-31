import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '@/types';
import { checkIsAdmin, fetchAdminEmails } from '@/lib/api';
import { checkIsHR } from '@/lib/requestApi';
import { adminEmails as fallbackAdminEmails } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isHR: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<string[]>(fallbackAdminEmails);
  const [hrStatus, setHrStatus] = useState(false);

  const loadAdminEmails = async () => {
    const result = await fetchAdminEmails();
    if (result.data) {
      setAdminEmails(result.data);
    }
    // Keep fallback if fetch fails
  };

  useEffect(() => {
    const init = async () => {
      await loadAdminEmails();

      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          
          if (session?.user?.email) {
            // Defer admin check to avoid Supabase deadlock
            setTimeout(async () => {
              const isAdminUser = await checkIsAdmin(session.user.email || '');
              const isHRUser = await checkIsHR(session.user.email || '');
              setHrStatus(isHRUser);
              setUser({
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email || '',
                role: isAdminUser ? 'admin' : isHRUser ? 'admin' : 'agent' // HR gets admin-level access to view updates
              });
            }, 0);
          } else {
            setUser(null);
            setHrStatus(false);
          }
        }
      );

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const isAdminUser = await checkIsAdmin(session.user.email);
        const isHRUser = await checkIsHR(session.user.email);
        setHrStatus(isHRUser);
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role: isAdminUser ? 'admin' : isHRUser ? 'admin' : 'agent'
        });
      }
      
      setIsLoading(false);

      return () => subscription.unsubscribe();
    };

    init();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email is in the allowlist (user_roles table)
    try {
      const { data, error } = await supabase.functions.invoke('check-allowlist', {
        body: { email: normalizedEmail }
      });

      if (error) {
        console.error('Allowlist check error:', error);
        return { success: false, error: 'Unable to verify email. Please try again.' };
      }

      if (!data?.allowed) {
        return { success: false, error: 'Email not recognized. Please contact your administrator to be added.' };
      }
    } catch (err) {
      console.error('Failed to check allowlist:', err);
      return { success: false, error: 'Unable to verify email. Please try again.' };
    }

    // Use Supabase Auth with email/password
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });
    
    if (error) {
      console.error('Login error:', error);
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password. Please try again.' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, error: 'Please verify your email before logging in.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHrStatus(false);
  };

  const isAdmin = user?.role === 'admin' && !hrStatus;
  const isHR = hrStatus;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, isHR }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
