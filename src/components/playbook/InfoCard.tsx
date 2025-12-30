import { FileText, Globe, LayoutList, CreditCard, Package, Users } from 'lucide-react';
import { InfoGridItem } from '@/lib/playbookTypes';

const ICONS: Record<string, React.ElementType> = {
  document: FileText,
  globe: Globe,
  list: LayoutList,
  card: CreditCard,
  package: Package,
  users: Users,
};

interface InfoCardProps {
  item: InfoGridItem;
}

export function InfoCard({ item }: InfoCardProps) {
  const Icon = item.icon ? ICONS[item.icon] || FileText : FileText;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold text-foreground">{item.title}</h4>
      </div>
      <div className="space-y-2">
        {item.items.map((field, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <LayoutList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              <span className="font-medium text-foreground">{field.label}:</span>{' '}
              <span className="text-muted-foreground">{field.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
