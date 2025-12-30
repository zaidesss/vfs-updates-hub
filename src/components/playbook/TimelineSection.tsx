import { Clock } from 'lucide-react';
import { TimelineEntry } from '@/lib/playbookTypes';

interface TimelineSectionProps {
  entries: TimelineEntry[];
}

export function TimelineSection({ entries }: TimelineSectionProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, idx) => (
        <div key={idx} className="flex gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">{entry.date}:</span>{' '}
            <span className="text-muted-foreground">
              {entry.description} – by {entry.author}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
