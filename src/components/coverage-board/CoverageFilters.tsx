import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X, ChevronDown, Search } from 'lucide-react';
import type { AgentScheduleRow } from '@/lib/coverageBoardApi';

// ── Filter state shape ──────────────────────────────────────────────────────

export interface CoverageFilterState {
  zdInstance: string | null;
  positions: string[];
  agentNames: string[];
  daysOff: string[];
}

export const EMPTY_FILTERS: CoverageFilterState = {
  zdInstance: null,
  positions: [],
  agentNames: [],
  daysOff: [],
};

// ── Constants ───────────────────────────────────────────────────────────────

const POSITION_OPTIONS = [
  'Hybrid Support',
  'Phone Support',
  'Chat Support',
  'Email Support',
  'Logistics',
  'Team Lead',
  'Technical Support',
];

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Filter application logic ────────────────────────────────────────────────

export function applyFilters(agents: AgentScheduleRow[], filters: CoverageFilterState): AgentScheduleRow[] {
  return agents.filter(agent => {
    if (filters.zdInstance && agent.zendesk_instance !== filters.zdInstance) return false;
    if (filters.positions.length > 0 && !filters.positions.includes(agent.position || '')) return false;
    if (filters.agentNames.length > 0) {
      const name = agent.full_name || agent.agent_name || agent.email;
      if (!filters.agentNames.includes(name)) return false;
    }
    if (filters.daysOff.length > 0) {
      if (!agent.day_off || !filters.daysOff.some(d => agent.day_off!.some(off => off.toLowerCase() === d.toLowerCase()))) return false;
    }
    return true;
  });
}

// ── View toggle ─────────────────────────────────────────────────────────────

interface CoverageViewToggleProps {
  showEffective: boolean;
  onToggleView: (effective: boolean) => void;
}

function CoverageViewToggle({ showEffective, onToggleView }: CoverageViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">View:</span>
      <div className="flex rounded-md border border-border overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-none text-xs h-7 px-3',
            !showEffective && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
          )}
          onClick={() => onToggleView(false)}
        >
          Scheduled
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-none text-xs h-7 px-3 border-l border-border',
            showEffective && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
          )}
          onClick={() => onToggleView(true)}
        >
          Effective
        </Button>
      </div>
    </div>
  );
}

// ── Multi-select popover ────────────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = searchable
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] rounded-full">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 z-50 bg-popover" align="start">
        {searchable && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        )}
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-xs"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1">No results</p>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs mt-1"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Main Filters Component ──────────────────────────────────────────────────

interface CoverageFiltersProps {
  showEffective: boolean;
  onToggleView: (effective: boolean) => void;
  filters: CoverageFilterState;
  onFiltersChange: (filters: CoverageFilterState) => void;
  agents: AgentScheduleRow[];
}

export function CoverageFilters({
  showEffective,
  onToggleView,
  filters,
  onFiltersChange,
  agents,
}: CoverageFiltersProps) {
  // Derive unique agent names for the searchable dropdown
  const agentNameOptions = useMemo(() => {
    const names = agents.map(a => a.full_name || a.agent_name || a.email).filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [agents]);

  const activeCount = (filters.zdInstance ? 1 : 0) + (filters.positions.length > 0 ? 1 : 0) + (filters.agentNames.length > 0 ? 1 : 0) + (filters.daysOff.length > 0 ? 1 : 0);

  const clearAll = () => onFiltersChange(EMPTY_FILTERS);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CoverageViewToggle showEffective={showEffective} onToggleView={onToggleView} />

      <div className="w-px h-5 bg-border mx-1" />

      <Filter className="h-3.5 w-3.5 text-muted-foreground" />

      {/* ZD Instance */}
      <Select
        value={filters.zdInstance || 'all'}
        onValueChange={v => onFiltersChange({ ...filters, zdInstance: v === 'all' ? null : v })}
      >
        <SelectTrigger className="h-8 w-[100px] text-xs">
          <SelectValue placeholder="ZD Instance" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="all">All ZD</SelectItem>
          <SelectItem value="ZD1">ZD1</SelectItem>
          <SelectItem value="ZD2">ZD2</SelectItem>
        </SelectContent>
      </Select>

      {/* Position */}
      <MultiSelectFilter
        label="Position"
        options={POSITION_OPTIONS}
        selected={filters.positions}
        onChange={positions => onFiltersChange({ ...filters, positions })}
      />

      {/* Agent Names */}
      <MultiSelectFilter
        label="Agent"
        options={agentNameOptions}
        selected={filters.agentNames}
        onChange={agentNames => onFiltersChange({ ...filters, agentNames })}
        searchable
      />

      {/* Day Off */}
      <MultiSelectFilter
        label="Day Off"
        options={DAY_OPTIONS}
        selected={filters.daysOff}
        onChange={daysOff => onFiltersChange({ ...filters, daysOff })}
      />

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={clearAll}>
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
