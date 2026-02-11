interface MainGroupHeaderProps {
  label: string;
  totalCount: number;
}

export function MainGroupHeader({ label, totalCount }: MainGroupHeaderProps) {
  return (
    <div className="col-span-full sticky left-0 z-10 flex items-center gap-2 px-3 py-2 bg-primary/10 border-y border-border text-xs font-bold text-primary uppercase tracking-wide">
      {label}
      <span className="text-[10px] font-normal normal-case text-muted-foreground">({totalCount} agents)</span>
    </div>
  );
}

interface SubGroupHeaderProps {
  subLabel: string;
  agentCount: number;
}

export function SubGroupHeader({ subLabel, agentCount }: SubGroupHeaderProps) {
  return (
    <div className="col-span-full sticky left-0 z-10 flex items-center gap-2 px-3 pl-6 py-1 bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground tracking-wide">
      {subLabel}
      <span className="text-[10px] font-normal">({agentCount})</span>
    </div>
  );
}
