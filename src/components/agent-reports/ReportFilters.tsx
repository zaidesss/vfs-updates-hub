import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { 
  type IncidentType, 
  type ReportStatus,
  INCIDENT_TYPE_CONFIG,
  STATUS_CONFIG,
} from '@/lib/agentReportsApi';

interface ReportFiltersProps {
  year: number;
  month: number;
  agentEmail: string;
  incidentType: string;
  status: string;
  agents: { email: string; name: string }[];
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onAgentChange: (email: string) => void;
  onIncidentTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function ReportFilters({
  year,
  month,
  agentEmail,
  incidentType,
  status,
  agents,
  onYearChange,
  onMonthChange,
  onAgentChange,
  onIncidentTypeChange,
  onStatusChange,
  onClearFilters,
}: ReportFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const hasActiveFilters = agentEmail || incidentType || status;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year Filter */}
      <Select value={year.toString()} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Filter */}
      <Select value={month.toString()} onValueChange={(v) => onMonthChange(parseInt(v, 10))}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Agent Filter */}
      <Select value={agentEmail || 'all'} onValueChange={(v) => onAgentChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.email} value={agent.email}>
              {agent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Incident Type Filter */}
      <Select value={incidentType || 'all'} onValueChange={(v) => onIncidentTypeChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Incidents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Incidents</SelectItem>
          {(Object.keys(INCIDENT_TYPE_CONFIG) as IncidentType[]).map((type) => (
            <SelectItem key={type} value={type}>
              {INCIDENT_TYPE_CONFIG[type].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={status || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
