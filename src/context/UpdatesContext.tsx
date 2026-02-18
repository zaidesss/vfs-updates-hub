import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Update, Acknowledgement } from '@/types';
import { fetchUpdates, fetchAcknowledgements, acknowledgeUpdate as apiAcknowledgeUpdate, createUpdate as apiCreateUpdate, editUpdate as apiEditUpdate } from '@/lib/api';
import { mockUpdates, mockAcknowledgements } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

interface UpdatesContextType {
  updates: Update[];
  acknowledgements: Acknowledgement[];
  isLoading: boolean;
  getUpdateById: (id: string) => Update | undefined;
  isAcknowledged: (updateId: string, agentEmail: string) => boolean;
  getAcknowledgement: (updateId: string, agentEmail: string) => Acknowledgement | undefined;
  acknowledgeUpdate: (updateId: string, agentEmail: string) => Promise<void>;
  getAcknowledgementCount: (updateId: string) => number;
  getAcknowledgementsForUpdate: (updateId: string) => Acknowledgement[];
  createUpdate: (update: Omit<Update, 'id' | 'posted_at'>) => Promise<void>;
  editUpdate: (updateId: string, update: Partial<Omit<Update, 'id' | 'posted_at'>>, changedBy?: string) => Promise<void>;
  updateUpdateStatus: (id: string, status: Update['status'], changedBy?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  ensureLoaded: () => void;
  getPendingUpdates: (agentEmail: string) => Update[];
  getPendingUpdateCount: (agentEmail: string) => number;
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    if (initialized) return; // Already loaded
    
    setIsLoading(true);
    
    const [updatesResult, acksResult] = await Promise.all([
      fetchUpdates(),
      fetchAcknowledgements(),
    ]);

    if (updatesResult.data) {
      setUpdates(updatesResult.data);
    } else {
      setUpdates(mockUpdates);
    }

    if (acksResult.data) {
      setAcknowledgements(acksResult.data);
    } else {
      setAcknowledgements(mockAcknowledgements);
    }

    setIsLoading(false);
    setInitialized(true);
  };

  // Lazy initialization - don't fetch on mount, wait for first access

  const refreshData = async () => {
    setInitialized(false); // Force reload
    await loadData();
  };

  // Ensure data is loaded - call this before accessing updates
  const ensureLoaded = () => {
    if (!initialized && !isLoading) {
      loadData();
    }
  };

  const getUpdateById = (id: string) => updates.find(u => u.id === id);

  const isAcknowledged = (updateId: string, agentEmail: string) => {
    return acknowledgements.some(
      a => a.update_id === updateId && a.agent_email.toLowerCase() === agentEmail.toLowerCase()
    );
  };

  const getAcknowledgement = (updateId: string, agentEmail: string) => {
    return acknowledgements.find(
      a => a.update_id === updateId && a.agent_email.toLowerCase() === agentEmail.toLowerCase()
    );
  };

  const acknowledgeUpdate = async (updateId: string, agentEmail: string) => {
    const result = await apiAcknowledgeUpdate(updateId, agentEmail);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge update. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Optimistically add the acknowledgement
    const newAck: Acknowledgement = {
      update_id: updateId,
      agent_email: agentEmail,
      acknowledged_at: result.data?.acknowledged_at || new Date().toISOString(),
    };
    
    setAcknowledgements(prev => [...prev, newAck]);
    
    toast({
      title: 'Update acknowledged',
      description: 'Thank you for reviewing this update.',
    });
  };

  const getAcknowledgementCount = (updateId: string) => {
    return acknowledgements.filter(a => a.update_id === updateId).length;
  };

  const getAcknowledgementsForUpdate = (updateId: string) => {
    return acknowledgements.filter(a => a.update_id === updateId);
  };

  const getPendingUpdates = (agentEmail: string): Update[] => {
    const email = agentEmail.toLowerCase();
    return updates.filter(u => 
      u.status === 'published' &&
      !acknowledgements.some(a => 
        a.update_id === u.id && 
        a.agent_email.toLowerCase() === email
      )
    );
  };

  const getPendingUpdateCount = (agentEmail: string): number => {
    return getPendingUpdates(agentEmail).length;
  };

  const createUpdate = async (update: Omit<Update, 'id' | 'posted_at'>) => {
    const result = await apiCreateUpdate(update);
    
    if (result.error) {
      console.error('Create update error:', result.error);
      toast({
        title: 'Error',
        description: result.error || 'Failed to create update. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (result.data?.update) {
      setUpdates(prev => [result.data!.update, ...prev]);
    }
    
    toast({
      title: 'Update created',
      description: 'The update has been saved.',
    });
  };

  const editUpdate = async (updateId: string, update: Partial<Omit<Update, 'id' | 'posted_at'>>, changedBy?: string) => {
    const result = await apiEditUpdate(updateId, update, changedBy);
    
    if (result.error) {
      console.error('Edit update error:', result.error);
      toast({
        title: 'Error',
        description: result.error || 'Failed to edit update. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (result.data?.update) {
      setUpdates(prev => prev.map(u => u.id === updateId ? result.data!.update : u));
    }
    
    toast({
      title: 'Update edited',
      description: 'The update has been saved and notifications sent.',
    });
  };

  const updateUpdateStatus = async (id: string, status: Update['status'], changedBy?: string) => {
    const result = await apiEditUpdate(id, { status }, changedBy);
    
    if (result.error) {
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (result.data?.update) {
      setUpdates(prev => prev.map(u => u.id === id ? result.data!.update : u));
    }
    
    toast({
      title: 'Status updated',
      description: `Update is now ${status}.`,
    });
  };

  return (
    <UpdatesContext.Provider value={{
      updates,
      acknowledgements,
      isLoading,
      getUpdateById,
      isAcknowledged,
      getAcknowledgement,
      acknowledgeUpdate,
      getAcknowledgementCount,
      getAcknowledgementsForUpdate,
      createUpdate,
      editUpdate,
      updateUpdateStatus,
      refreshData,
      ensureLoaded,
      getPendingUpdates,
      getPendingUpdateCount,
    }}>
      {children}
    </UpdatesContext.Provider>
  );
}

export function useUpdates() {
  const context = useContext(UpdatesContext);
  if (context === undefined) {
    throw new Error('useUpdates must be used within an UpdatesProvider');
  }
  return context;
}
