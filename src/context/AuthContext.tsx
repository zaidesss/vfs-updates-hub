import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, Agent } from '@/types';
import { fetchAgents, checkIsAdmin, fetchAdminEmails } from '@/lib/api';
import { mockAgents, adminEmails as fallbackAdminEmails } from '@/lib/mockData';

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

      // Check for stored session
      const storedUser = localStorage.getItem('vfs_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          // Re-verify admin status from database
          const isAdminUser = await checkIsAdmin(parsedUser.email);
          parsedUser.role = isAdminUser ? 'admin' : 'agent';
          setUser(parsedUser);
          localStorage.setItem('vfs_user', JSON.stringify(parsedUser));
        } catch (e) {
          localStorage.removeItem('vfs_user');
        }
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const refreshAgents = async () => {
    await Promise.all([loadAgents(), loadAdminEmails()]);
  };

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Refresh agents and admin lists before login
    await Promise.all([loadAgents(), loadAdminEmails()]);
    
    // Find agent by email
    const agent = agents.find(a => a.email.toLowerCase() === normalizedEmail && a.active);
    
    if (!agent) {
      return { success: false, error: 'Email not recognized. Please contact your administrator.' };
    }

    // Check admin status from database
    const isAdminUser = await checkIsAdmin(normalizedEmail);
    
    const authUser: AuthUser = {
      email: agent.email,
      name: agent.name,
      role: isAdminUser ? 'admin' : 'agent',
    };

    setUser(authUser);
    localStorage.setItem('vfs_user', JSON.stringify(authUser));
    
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vfs_user');
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
