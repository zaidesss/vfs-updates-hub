import { PlaybookSection as PlaybookSectionType, SectionContent } from '@/lib/playbookTypes';
import { SectionMarker } from './SectionMarker';
import { InfoCard } from './InfoCard';
import { RoleCard } from './RoleCard';
import { CalloutBox } from './CalloutBox';
import { MessageTemplate } from './MessageTemplate';
import { Checklist } from './Checklist';
import { StepsSection } from './StepsSection';
import { TimelineSection } from './TimelineSection';
import { Users } from 'lucide-react';

interface PlaybookSectionProps {
  section: PlaybookSectionType;
}

function renderContent(content: SectionContent, index: number) {
  switch (content.type) {
    case 'info-grid':
      return (
        <div key={index} className="grid md:grid-cols-2 gap-4">
          {content.items.map((item, idx) => (
            <InfoCard key={idx} item={item} />
          ))}
        </div>
      );

    case 'role-cards':
      return (
        <div key={index} className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Roles & Responsibilities</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {content.roles.map((role, idx) => (
              <RoleCard key={idx} role={role} />
            ))}
          </div>
        </div>
      );

    case 'steps':
      return <StepsSection key={index} steps={content} />;

    case 'callout':
      return <CalloutBox key={index} callout={content} />;

    case 'message-template':
      return <MessageTemplate key={index} template={content} />;

    case 'checklist':
      return <Checklist key={index} checklist={content} />;

    case 'paragraph':
      return (
        <p key={index} className="text-foreground/90 leading-relaxed">
          {content.text}
        </p>
      );

    case 'table':
      return (
        <div key={index} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {content.headers.map((header, idx) => (
                  <th key={idx} className="text-left py-2 px-3 font-semibold text-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/50">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="py-2 px-3 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'list':
      return (
        <div key={index} className="space-y-2">
          {content.title && (
            <h4 className="font-semibold text-foreground">{content.title}</h4>
          )}
          <ul className="space-y-1">
            {content.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary">•</span>
                {item.label ? (
                  <span>
                    <span className="font-medium text-foreground">{item.label}:</span>{' '}
                    <span className="text-muted-foreground">{item.value}</span>
                  </span>
                ) : (
                  <span className="text-foreground">{item.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export function PlaybookSection({ section }: PlaybookSectionProps) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <SectionMarker letter={section.letter} size="md" />
        <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
      </div>
      <div className="space-y-6 pl-0 md:pl-[52px]">
        {section.content.map((content, idx) => renderContent(content, idx))}
      </div>
    </section>
  );
}
