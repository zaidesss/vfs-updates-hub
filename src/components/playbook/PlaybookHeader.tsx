import { Badge } from '@/components/ui/badge';

interface PlaybookHeaderProps {
  title: string;
  subtitle: string;
  tags: string[];
}

export function PlaybookHeader({ title, subtitle, tags }: PlaybookHeaderProps) {
  return (
    <div className="text-center space-y-4 py-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
        {title}
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        {subtitle}
      </p>
      {tags.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {tags.map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="px-3 py-1 bg-[hsl(35,30%,90%)] text-foreground/80 border border-[hsl(35,30%,80%)] rounded-full"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
