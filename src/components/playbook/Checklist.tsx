import { CheckSquare } from 'lucide-react';
import { ChecklistContent } from '@/lib/playbookTypes';

interface ChecklistProps {
  checklist: ChecklistContent;
}

export function Checklist({ checklist }: ChecklistProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      {checklist.title && (
        <h4 className="font-semibold text-foreground mb-3">{checklist.title}</h4>
      )}
      <ul className="space-y-2">
        {checklist.items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
