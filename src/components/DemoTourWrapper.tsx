import { DemoTour } from '@/components/DemoTour';
import { useDemoTour } from '@/context/DemoTourContext';
import { useAuth } from '@/context/AuthContext';
import { getTourStepsForRole } from '@/lib/demoTourSteps';

export function DemoTourWrapper() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const { showTour, closeTour, completeTour } = useDemoTour();

  if (!user?.email) return null;

  const steps = getTourStepsForRole(isAdmin, isHR, isSuperAdmin);

  return (
    <DemoTour
      steps={steps}
      isOpen={showTour}
      onClose={closeTour}
      onComplete={completeTour}
      userEmail={user.email}
    />
  );
}
