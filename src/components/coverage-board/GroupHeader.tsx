interface GroupHeaderProps {
  label: string;
  agentCount: number;
}

export function GroupHeader({ label, agentCount }: GroupHeaderProps) {
  return (
    <div className="col-span-full sticky left-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-muted/60 border-y border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
      <span className="text-[10px] font-normal normal-case">({agentCount})</span>
    </div>
  );
}
