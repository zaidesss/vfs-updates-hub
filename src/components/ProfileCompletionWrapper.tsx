import { useAuth } from '@/context/AuthContext';
import { ProfileCompletionModal } from './ProfileCompletionModal';

export function ProfileCompletionWrapper() {
  const { user } = useAuth();

  // Only render the modal if user is logged in
  if (!user) {
    return null;
  }

  return <ProfileCompletionModal />;
}
