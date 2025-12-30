import { RoleCard as RoleCardType, ROLE_COLORS } from '@/lib/playbookTypes';
import { cn } from '@/lib/utils';

interface RoleCardProps {
  role: RoleCardType;
}

export function RoleCard({ role }: RoleCardProps) {
  const colorConfig = ROLE_COLORS[role.color || 'blue'];

  return (
    <div
      className={cn(
        'rounded-xl border-t-4 p-5 shadow-sm',
        colorConfig.bg,
        colorConfig.border
      )}
    >
      <h4 className="font-semibold text-foreground mb-2">{role.title}</h4>
      <p className="text-sm text-muted-foreground">{role.description}</p>
    </div>
  );
}
