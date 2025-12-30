import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, Agent } from '@/types';
import { fetchAgents, checkIsAdmin, fetchAdminEmails } from '@/lib/api';
import { mockAgents, adminEmails as fallbackAdminEmails } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: AuthUser | null;
  agents: Agent[];
  isLoading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  refreshAgents: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminEmails, setAdminEmails] = useState<string[]>(fallbackAdminEmails);

  const loadAgents = async () => {
    const result = await fetchAgents();
    if (result.data) {
      setAgents(result.data);
    } else {
      // Fallback to mock data
      setAgents(mockAgents);
    }
  };

  const loadAdminEmails = async () => {
    const result = await fetchAdminEmails();
    if (result.data) {
      setAdminEmails(result.data);
    }
    // Keep fallback if fetch fails
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadAgents(), loadAdminEmails()]);

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

  const refreshAgents = async () => {
    await Promise.all([loadAgents(), loadAdminEmails()]);
  };

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Refresh agents list before login
    await Promise.all([loadAgents(), loadAdminEmails()]);
    
    // Find agent by email to verify they're in the system
    const agent = agents.find(a => a.email.toLowerCase() === normalizedEmail && a.active);
    
    if (!agent) {
      return { success: false, error: 'Email not recognized. Please contact your administrator.' };
    }

    // Use Supabase Auth magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/updates`,
        shouldCreateUser: false, // Only allow existing users
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
    <AuthContext.Provider value={{ user, agents, isLoading, login, logout, isAdmin, refreshAgents }}>
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
