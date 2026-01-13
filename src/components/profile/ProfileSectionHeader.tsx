import { Badge } from '@/components/ui/badge';
import { Lock, Edit } from 'lucide-react';

interface ProfileSectionHeaderProps {
  title: string;
  badge?: 'user' | 'hr';
  locked?: boolean;
}

export function ProfileSectionHeader({ title, badge, locked }: ProfileSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        {badge === 'user' && (
          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <Edit className="h-3 w-3 mr-1" />
            Your Information
          </Badge>
        )}
        {badge === 'hr' && (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Lock className="h-3 w-3 mr-1" />
            Managed by HR
          </Badge>
        )}
      </div>
      {locked && (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
