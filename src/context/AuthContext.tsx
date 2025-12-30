import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '@/types';
import { checkIsAdmin, fetchAdminEmails } from '@/lib/api';
import { adminEmails as fallbackAdminEmails } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<string[]>(fallbackAdminEmails);

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
              setUser({
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email || '',
                role: isAdminUser ? 'admin' : 'agent'
              });
            }, 0);
          } else {
            setUser(null);
          }
        }
      );

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const isAdminUser = await checkIsAdmin(session.user.email);
        setUser({
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role: isAdminUser ? 'admin' : 'agent'
        });
      }
      
      setIsLoading(false);

      return () => subscription.unsubscribe();
    };

    init();
  }, []);

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
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

    // Use Supabase Auth magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/updates`,
        shouldCreateUser: true, // Auto-create user if in allowlist
      }
    });
    
    if (error) {
      console.error('Login error:', error);
      // If user doesn't exist in Supabase, create them first
      if (error.message.includes('Signups not allowed')) {
        return { success: false, error: 'Account not set up. Please contact your administrator.' };
      }
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      error: 'Check your email for the login link. It may take a few moments to arrive.' 
    };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin }}>
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
