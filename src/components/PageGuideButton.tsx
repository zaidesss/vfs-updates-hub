import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { usePageDemo } from '@/context/PageDemoContext';

interface PageGuideButtonProps {
  pageId: string;
  className?: string;
}

export function PageGuideButton({ pageId, className }: PageGuideButtonProps) {
  const { openPageGuide } = usePageDemo();
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openPageGuide(pageId)}
      className={className}
      title="Page Guide"
    >
      <HelpCircle className="h-4 w-4 mr-2" />
      Guide
    </Button>
  );
}
