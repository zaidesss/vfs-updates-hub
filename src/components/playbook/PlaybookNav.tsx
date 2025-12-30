import { PlaybookSection } from '@/lib/playbookTypes';
import { SectionMarker } from './SectionMarker';
import { cn } from '@/lib/utils';

interface PlaybookNavProps {
  sections: PlaybookSection[];
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
}

export function PlaybookNav({ sections, activeSection, onSectionClick }: PlaybookNavProps) {
  return (
    <nav className="sticky top-0 z-10 bg-[hsl(35,40%,96%)]/95 backdrop-blur-sm border-b border-[hsl(35,30%,88%)] py-3">
      <div className="flex items-center justify-center gap-6 overflow-x-auto px-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={cn(
              'text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground',
              activeSection === section.id
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {section.title}
          </button>
        ))}
      </div>
    </nav>
  );
}

interface PlaybookMarkerNavProps {
  sections: PlaybookSection[];
}

export function PlaybookMarkerNav({ sections }: PlaybookMarkerNavProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-6">
      {sections.map((section) => (
        <SectionMarker key={section.id} letter={section.letter} size="lg" />
      ))}
    </div>
  );
}
