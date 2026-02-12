interface MainGroupHeaderProps {
  label: string;
  totalCount: number;
}

export function MainGroupHeader({ label, totalCount }: MainGroupHeaderProps) {
  return (
    <div className="min-w-[5000px] border-y border-border bg-primary/10">
      <div className="sticky left-0 z-20 flex items-center gap-2 px-3 py-2 bg-primary/10 text-xs font-bold text-primary uppercase tracking-wide w-fit">
        {label}
        <span className="text-[10px] font-normal normal-case text-muted-foreground">({totalCount} agents)</span>
      </div>
    </div>
  );
}

interface SubGroupHeaderProps {
  subLabel: string;
  agentCount: number;
}

export function SubGroupHeader({ subLabel, agentCount }: SubGroupHeaderProps) {
  return (
    <div className="min-w-[5000px] border-b border-border bg-muted">
      <div className="sticky left-0 z-20 flex items-center gap-2 px-3 pl-6 py-1 bg-muted text-[11px] font-semibold text-muted-foreground tracking-wide w-fit">
        {subLabel}
        <span className="text-[10px] font-normal">({agentCount})</span>
      </div>
    </div>
  );
}
