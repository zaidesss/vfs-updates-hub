import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { getPageSteps } from '@/lib/pageDemoSteps';
import type { TourStep } from '@/components/DemoTour';

interface PageDemoGuideProps {
  pageId: string;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  isHR: boolean;
}

export function PageDemoGuide({ pageId, isOpen, onClose, isAdmin, isHR }: PageDemoGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = getPageSteps(pageId, isAdmin, isHR);
  const currentStepData = steps[currentStep];
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
  const isLastStep = currentStep === steps.length - 1;

  // Reset step when guide opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, pageId]);

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !currentStepData?.target) {
      setTargetRect(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(currentStepData.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    // Small delay to allow DOM to settle
    const timer = setTimeout(findElement, 100);
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, currentStepData?.target]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose();
      setCurrentStep(0);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || steps.length === 0) return null;

  // Calculate card position based on target with viewport clamping
  const getCardPosition = (): React.CSSProperties => {
    const cardWidth = 400;
    const cardHeight = 300;
    const padding = 20;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    // Default to center if no target or position is center
    if (!targetRect || currentStepData?.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    let top = 0;
    let left = 0;

    switch (currentStepData?.position) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left;
        break;
      case 'top':
        top = targetRect.top - cardHeight - padding;
        left = targetRect.left;
        break;
      case 'right':
        top = targetRect.top;
        left = targetRect.right + padding;
        break;
      case 'left':
        top = targetRect.top;
        left = targetRect.left - cardWidth - padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left;
    }

    // CLAMP to viewport bounds - ensure card is always visible
    top = Math.max(padding, Math.min(top, viewportHeight - cardHeight - padding));
    left = Math.max(padding, Math.min(left, viewportWidth - cardWidth - padding));

    return {
      position: 'fixed' as const,
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  return (
    <>
      {/* Backdrop - clickable to close */}
      <div 
        className="fixed inset-0 z-[100] bg-black/60 cursor-pointer" 
        onClick={onClose}
      />

      {/* Spotlight highlight */}
      {targetRect && (
        <div
          className="fixed z-[101] rounded-lg ring-4 ring-primary ring-offset-4 ring-offset-background pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* Tour Card - with explicit background for reliability */}
      <Card
        className="fixed z-[102] w-[90vw] max-w-md shadow-2xl border-primary/20 bg-card"
        style={{
          ...getCardPosition(),
          backgroundColor: 'hsl(var(--card))',
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{currentStepData?.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <Progress value={progress} className="flex-1 h-1" />
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {currentStepData?.content}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="flex items-center gap-1"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
