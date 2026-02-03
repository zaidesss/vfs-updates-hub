import { useState } from 'react';
import { PlaybookSection } from '@/lib/playbookTypes';
import { SectionMarker } from './SectionMarker';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PlaybookNavProps {
  sections: PlaybookSection[];
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
}

export function PlaybookNav({ sections, activeSection, onSectionClick }: PlaybookNavProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav className="sticky top-0 z-10 bg-[hsl(35,40%,96%)]/95 backdrop-blur-sm border-b border-[hsl(35,30%,88%)] py-3">
      <div className="max-w-4xl mx-auto px-4">
        {/* Collapsed: horizontal scroll view */}
        {!expanded && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-6 overflow-x-auto flex-1">
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
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2 px-2 py-1 rounded-md hover:bg-muted"
            >
              <span>View All</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Expanded: wrap view with all sections visible */}
        {expanded && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">All Sections</span>
              <button
                onClick={() => setExpanded(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <span>Collapse</span>
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    onSectionClick(section.id);
                    setExpanded(false);
                  }}
                  className={cn(
                    'text-sm font-medium px-3 py-1.5 rounded-md transition-colors',
                    activeSection === section.id
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                      {section.letter}
                    </span>
                    {section.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
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
