import { CheckCircle, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Section marker component
export function SectionMarker({ letter, color }: { letter: string; color: string }) {
  return (
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-sm', color)}>
      {letter}
    </div>
  );
}

// Callout box component
export function CalloutBox({ 
  variant, 
  title, 
  children 
}: { 
  variant: 'info' | 'tip' | 'warning' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600' },
    tip: { bg: 'bg-purple-50 border-purple-200', icon: Lightbulb, iconColor: 'text-purple-600' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
    success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-600' },
  };

  const style = styles[variant];
  const Icon = style.icon;

  return (
    <div className={cn('rounded-lg border p-4 my-4', style.bg)}>
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', style.iconColor)} />
        <div>
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Checklist component
export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 my-4">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Section component
export function GuideSection({ 
  letter, 
  color, 
  title, 
  children 
}: { 
  letter: string; 
  color: string; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${letter.toLowerCase()}`} className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <SectionMarker letter={letter} color={color} />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

// Quick reference table component
export function QuickTable({ 
  headers, 
  rows 
}: { 
  headers: string[]; 
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {headers.map((header, i) => (
              <th key={i} className="border border-border px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
              {row.map((cell, j) => (
                <td key={j} className="border border-border px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
