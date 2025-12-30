import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Update, Acknowledgement } from '@/types';
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
  updateUpdateStatus: (id: string, status: Update['status']) => Promise<void>;
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined);

export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [updates, setUpdates] = useState<Update[]>(mockUpdates);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>(mockAcknowledgements);
  const [isLoading] = useState(false);
  const { toast } = useToast();

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
    // In production, this would call the API
    const newAck: Acknowledgement = {
      update_id: updateId,
      agent_email: agentEmail,
      acknowledged_at: new Date().toISOString(),
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

  const createUpdate = async (update: Omit<Update, 'id' | 'posted_at'>) => {
    const newUpdate: Update = {
      ...update,
      id: String(Date.now()),
      posted_at: new Date().toISOString(),
    };
    
    setUpdates(prev => [newUpdate, ...prev]);
    
    toast({
      title: 'Update created',
      description: 'The update has been saved.',
    });
  };

  const updateUpdateStatus = async (id: string, status: Update['status']) => {
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    
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
      updateUpdateStatus,
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
