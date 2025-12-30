import { useCallback, useEffect, useState } from 'react';
import { PlaybookArticle } from '@/lib/playbookTypes';
import { PlaybookHeader } from './PlaybookHeader';
import { PlaybookNav, PlaybookMarkerNav } from './PlaybookNav';
import { PlaybookSection } from './PlaybookSection';
import { TimelineSection } from './TimelineSection';
import { SectionMarker } from './SectionMarker';

interface PlaybookPageProps {
  article: PlaybookArticle;
}

export function PlaybookPage({ article }: PlaybookPageProps) {
  const [activeSection, setActiveSection] = useState<string | undefined>();

  const handleSectionClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = article.sections.map((s) => ({
        id: s.id,
        top: document.getElementById(s.id)?.getBoundingClientRect().top ?? 0,
      }));

      const current = sections.find((s) => s.top > 100) || sections[sections.length - 1];
      if (current) {
        const idx = sections.findIndex((s) => s.id === current.id);
        setActiveSection(idx > 0 ? sections[idx - 1].id : current.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article.sections]);

  return (
    <div className="min-h-screen bg-[hsl(35,40%,96%)]">
      {/* Sticky Navigation */}
      <PlaybookNav
        sections={article.sections}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* Section Markers Row */}
        <PlaybookMarkerNav sections={article.sections} />

        {/* Header */}
        <PlaybookHeader
          title={article.title}
          subtitle={article.subtitle}
          tags={article.tags}
        />

        {/* Sections */}
        <div className="space-y-12 mt-8">
          {article.sections.map((section) => (
            <PlaybookSection key={section.id} section={section} />
          ))}
        </div>

        {/* Timeline */}
        {article.timeline && article.timeline.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[hsl(35,30%,88%)]">
            <div className="flex items-center gap-3 mb-6">
              <SectionMarker letter="T" size="md" />
              <h2 className="text-xl font-semibold text-foreground">Timeline</h2>
            </div>
            <div className="pl-0 md:pl-[52px]">
              <TimelineSection entries={article.timeline} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
