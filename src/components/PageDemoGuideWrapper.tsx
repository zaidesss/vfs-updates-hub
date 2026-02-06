import { PageDemoGuide } from '@/components/PageDemoGuide';
import { usePageDemo } from '@/context/PageDemoContext';
import { useAuth } from '@/context/AuthContext';

export function PageDemoGuideWrapper() {
  const { isAdmin, isHR } = useAuth();
  const { showGuide, currentPageId, closePageGuide } = usePageDemo();

  return (
    <PageDemoGuide
      pageId={currentPageId}
      isOpen={showGuide}
      onClose={closePageGuide}
      isAdmin={isAdmin}
      isHR={isHR}
    />
  );
}
