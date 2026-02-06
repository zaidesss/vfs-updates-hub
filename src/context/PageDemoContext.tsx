import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageDemoContextType {
  showGuide: boolean;
  currentPageId: string;
  openPageGuide: (pageId: string) => void;
  closePageGuide: () => void;
}

const PageDemoContext = createContext<PageDemoContextType | undefined>(undefined);

export function PageDemoProvider({ children }: { children: ReactNode }) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentPageId, setCurrentPageId] = useState('');

  const openPageGuide = (pageId: string) => {
    setCurrentPageId(pageId);
    setShowGuide(true);
  };

  const closePageGuide = () => {
    setShowGuide(false);
  };

  return (
    <PageDemoContext.Provider value={{ showGuide, currentPageId, openPageGuide, closePageGuide }}>
      {children}
    </PageDemoContext.Provider>
  );
}

export function usePageDemo() {
  const context = useContext(PageDemoContext);
  if (context === undefined) {
    throw new Error('usePageDemo must be used within a PageDemoProvider');
  }
  return context;
}
