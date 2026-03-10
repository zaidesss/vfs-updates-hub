import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/auditLogApi';
import { Save, Search, ExternalLink, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DirectoryEntry,
  ViewConfigOption,
  fetchAllDirectoryEntries,
  fetchViewConfigOptions,
  bulkSaveEntries,
  syncAllProfilesToDirectory,
} from '@/lib/masterDirectoryApi';
import { resolvePositionCategory } from '@/lib/positionUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FilterableColumnHeader,
  ColumnFilter,
  SortDirection,
} from '@/components/master-directory/FilterableColumnHeader';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

// Column definitions for the table
type ColDef = {
  key: string;
  label: string;
  type: 'categorical' | 'numeric';
  getValue: (e: DirectoryEntry) => string | number | null;
  minWidth: string;
};

const COLUMNS: ColDef[] = [
  { key: 'full_name', label: 'Full Name', type: 'categorical', getValue: e => e.full_name, minWidth: '150px' },
  { key: 'position', label: 'Position', type: 'categorical', getValue: e => e.position, minWidth: '100px' },
  { key: 'team_lead', label: 'Team Lead', type: 'categorical', getValue: e => e.team_lead, minWidth: '120px' },
  { key: 'zendesk_instance', label: 'ZD Instance', type: 'categorical', getValue: e => e.zendesk_instance, minWidth: '100px' },
  { key: 'support_account', label: 'Support Account', type: 'categorical', getValue: e => e.support_account, minWidth: '100px' },
  { key: 'quota', label: 'Quota', type: 'numeric', getValue: e => e.quota, minWidth: '80px' },
  { key: 'agent_name', label: 'Agent Name', type: 'categorical', getValue: e => e.agent_name, minWidth: '120px' },
  { key: 'agent_tag', label: 'Agent Tag', type: 'categorical', getValue: e => e.agent_tag, minWidth: '100px' },
  { key: 'ticket_assignment', label: 'Ticket Assignment', type: 'categorical', getValue: e => {
    const isZD2 = !e.zendesk_instance || e.zendesk_instance === 'ZD2';
    return isZD2 ? 'ZD2' : e.ticket_assignment_enabled ? 'On' : 'Off';
  }, minWidth: '100px' },
  { key: 'assignment_view', label: 'Assignment View', type: 'categorical', getValue: e => e.ticket_assignment_view_id || 'Auto', minWidth: '150px' },
  { key: 'weekday_schedule', label: 'Weekday Schedule', type: 'categorical', getValue: e => e.weekday_schedule, minWidth: '130px' },
  { key: 'weekday_total_hours', label: 'WD Hours', type: 'numeric', getValue: e => e.weekday_total_hours, minWidth: '80px' },
  { key: 'wd_ticket_assign', label: 'WD Ticket Assign', type: 'categorical', getValue: e => e.wd_ticket_assign, minWidth: '100px' },
  { key: 'weekend_schedule', label: 'Weekend Schedule', type: 'categorical', getValue: e => e.weekend_schedule, minWidth: '130px' },
  { key: 'weekend_total_hours', label: 'WE Hours', type: 'numeric', getValue: e => e.weekend_total_hours, minWidth: '80px' },
  { key: 'we_ticket_assign', label: 'WE Ticket Assign', type: 'categorical', getValue: e => e.we_ticket_assign, minWidth: '100px' },
  { key: 'break_schedule', label: 'Break Schedule', type: 'categorical', getValue: e => e.break_schedule, minWidth: '130px' },
  { key: 'weekday_ot_schedule', label: 'Weekday OT', type: 'categorical', getValue: e => e.weekday_ot_schedule, minWidth: '130px' },
  { key: 'weekend_ot_schedule', label: 'Weekend OT', type: 'categorical', getValue: e => e.weekend_ot_schedule, minWidth: '130px' },
  { key: 'ot_total_hours', label: 'OT Hours', type: 'numeric', getValue: e => e.ot_total_hours, minWidth: '80px' },
  { key: 'overall_total_hours', label: 'Total Hours', type: 'numeric', getValue: e => e.overall_total_hours, minWidth: '80px' },
  { key: 'day_off', label: 'Day Off', type: 'categorical', getValue: e => (e.day_off || []).join(', ') || null, minWidth: '120px' },
];

export default function MasterDirectory() {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originalData, setOriginalData] = useState<DirectoryEntry[]>([]);
  const [editedData, setEditedData] = useState<DirectoryEntry[]>([]);
  const [viewConfigs, setViewConfigs] = useState<ViewConfigOption[]>([]);

  // Top-level quick filters (kept for convenience)
  const [teamLeadFilter, setTeamLeadFilter] = useState('all');
  const [zdInstanceFilter, setZdInstanceFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');

  // Column-level filters and sorting
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return editedData.some((entry) => {
      const original = originalData.find((o) => o.email === entry.email);
      if (!original) return false;
      return JSON.stringify(entry) !== JSON.stringify(original);
    });
  }, [editedData, originalData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [directoryResult, configs] = await Promise.all([
      fetchAllDirectoryEntries(),
      fetchViewConfigOptions(),
    ]);
    if (directoryResult.error) {
      toast({ title: 'Error', description: directoryResult.error, variant: 'destructive' });
    } else if (directoryResult.data) {
      setOriginalData(directoryResult.data);
      setEditedData(JSON.parse(JSON.stringify(directoryResult.data)));
    }
    setViewConfigs(configs);
    setIsLoading(false);
  };

  // Active (non-terminated) entries for computing filter options
  const activeEntries = useMemo(() => editedData.filter(e => e.employment_status !== 'Terminated'), [editedData]);

  // Compute unique values and numeric ranges per column
  const columnMeta = useMemo(() => {
    const meta: Record<string, { uniqueValues?: string[]; numericRange?: { min: number; max: number } }> = {};
    COLUMNS.forEach(col => {
      if (col.type === 'categorical') {
        if (col.key === 'day_off') {
          // Flatten day arrays
          const allDays = new Set<string>();
          activeEntries.forEach(e => (e.day_off || []).forEach(d => allDays.add(d)));
          meta[col.key] = { uniqueValues: [...allDays].sort() };
        } else {
          const vals = [...new Set(activeEntries.map(e => {
            const v = col.getValue(e);
            return v != null ? String(v) : null;
          }).filter(Boolean) as string[])].sort();
          meta[col.key] = { uniqueValues: vals };
        }
      } else {
        const nums = activeEntries.map(e => {
          const v = col.getValue(e);
          return typeof v === 'number' ? v : null;
        }).filter((n): n is number => n !== null);
        if (nums.length > 0) {
          meta[col.key] = { numericRange: { min: Math.min(...nums), max: Math.max(...nums) } };
        }
      }
    });
    return meta;
  }, [activeEntries]);

  // Quick-filter options
  const filterOptions = useMemo(() => {
    const teamLeads = [...new Set(activeEntries.map(e => e.team_lead).filter(Boolean))].sort() as string[];
    const zdInstances = [...new Set(activeEntries.map(e => e.zendesk_instance).filter(Boolean))].sort() as string[];
    const positionCategories = [...new Set(activeEntries.map(e => resolvePositionCategory(e.position)).filter(Boolean))].sort() as string[];
    return { teamLeads, zdInstances, positionCategories };
  }, [activeEntries]);

  // Filtered + sorted entries
  const filteredEntries = useMemo(() => {
    let result = activeEntries;

    // Quick-access dropdown filters
    if (teamLeadFilter !== 'all') result = result.filter(e => e.team_lead === teamLeadFilter);
    if (zdInstanceFilter !== 'all') result = result.filter(e => e.zendesk_instance === zdInstanceFilter);
    if (positionFilter !== 'all') result = result.filter(e => resolvePositionCategory(e.position) === positionFilter);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.full_name?.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
    }

    // Column-level filters
    Object.entries(columnFilters).forEach(([colKey, filter]) => {
      const colDef = COLUMNS.find(c => c.key === colKey);
      if (!colDef) return;

      if (filter.type === 'categorical') {
        if (colKey === 'day_off') {
          result = result.filter(e => {
            const days = e.day_off || [];
            return days.some(d => filter.values.has(d));
          });
        } else {
          result = result.filter(e => {
            const v = colDef.getValue(e);
            return filter.values.has(v != null ? String(v) : '');
          });
        }
      } else if (filter.type === 'numeric') {
        result = result.filter(e => {
          const v = colDef.getValue(e);
          if (typeof v !== 'number') return false;
          if (filter.min !== undefined && v < filter.min) return false;
          if (filter.max !== undefined && v > filter.max) return false;
          return true;
        });
      }
    });

    // Sorting
    if (sortConfig) {
      const colDef = COLUMNS.find(c => c.key === sortConfig.column);
      if (colDef) {
        result = [...result].sort((a, b) => {
          const va = colDef.getValue(a);
          const vb = colDef.getValue(b);
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;
          let cmp = 0;
          if (typeof va === 'number' && typeof vb === 'number') {
            cmp = va - vb;
          } else {
            cmp = String(va).localeCompare(String(vb));
          }
          return sortConfig.direction === 'desc' ? -cmp : cmp;
        });
      }
    }

    return result;
  }, [activeEntries, searchQuery, teamLeadFilter, zdInstanceFilter, positionFilter, columnFilters, sortConfig]);

  const columnFilterCount = Object.keys(columnFilters).length;
  const hasActiveFilters = teamLeadFilter !== 'all' || zdInstanceFilter !== 'all' || positionFilter !== 'all' || searchQuery.trim() !== '' || columnFilterCount > 0 || sortConfig !== null;

  const resetFilters = () => {
    setTeamLeadFilter('all');
    setZdInstanceFilter('all');
    setPositionFilter('all');
    setSearchQuery('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const handleColumnFilterChange = useCallback((colKey: string, filter: ColumnFilter | null) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (filter) next[colKey] = filter;
      else delete next[colKey];
      return next;
    });
  }, []);

  const handleSortChange = useCallback((colKey: string, direction: SortDirection) => {
    if (direction === null) setSortConfig(null);
    else setSortConfig({ column: colKey, direction });
  }, []);

  // Update a single field for an entry
  const updateField = (email: string, field: keyof DirectoryEntry, value: any) => {
    setEditedData((prev) =>
      prev.map((entry) => {
        if (entry.email.toLowerCase() !== email.toLowerCase()) return entry;
        return { ...entry, [field]: value };
      })
    );
  };

  // Handle ticket assignment toggle
  const handleTicketAssignmentToggle = async (email: string, enabled: boolean) => {
    updateField(email, 'ticket_assignment_enabled', enabled);
    try {
      await supabase.from('agent_profiles').update({ ticket_assignment_enabled: enabled }).eq('email', email.toLowerCase());
      const agent = editedData.find(e => e.email.toLowerCase() === email.toLowerCase());
      writeAuditLog({
        area: 'Master Directory',
        action_type: 'updated',
        entity_label: agent?.agent_name || email,
        changed_by: user?.email || '',
        changes: { ticket_assignment_enabled: { old: String(!enabled), new: String(enabled) } },
      });
    } catch (error) {
      console.error('Failed to update ticket assignment:', error);
    }
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    const { success, error } = await bulkSaveEntries(editedData, originalData, user?.email || '');
    setIsSaving(false);
    if (success) {
      toast({ title: 'Saved', description: 'All changes have been saved successfully.' });
      const dirChanges: string[] = [];
      editedData.forEach((entry) => {
        const orig = originalData.find(o => o.id === entry.id);
        if (!orig) { dirChanges.push(`${entry.agent_name || entry.email}: new entry`); return; }
        const changedFields: string[] = [];
        const fields = ['agent_name', 'support_account', 'support_type', 'quota', 'weekday_schedule', 'weekend_schedule'] as const;
        fields.forEach(f => { if (String((orig as any)[f] ?? '') !== String((entry as any)[f] ?? '')) changedFields.push(f); });
        if (changedFields.length > 0) dirChanges.push(`${entry.agent_name || entry.email}: ${changedFields.join(', ')}`);
      });
      writeAuditLog({
        area: 'Master Directory',
        action_type: 'updated',
        entity_label: 'Bulk directory update',
        changed_by: user?.email || '',
        metadata: { changed_agents: dirChanges.slice(0, 20), total_changes: dirChanges.length },
      });
      await loadData();
    } else {
      toast({ title: 'Error', description: error || 'Failed to save changes.', variant: 'destructive' });
    }
  };

  // Handle sync all from Bios
  const handleSyncAll = async () => {
    setIsSyncing(true);
    const { success, synced, error } = await syncAllProfilesToDirectory();
    setIsSyncing(false);
    if (success) {
      toast({ title: 'Sync Complete', description: `Successfully synced ${synced} profile(s) to Master Directory.` });
      writeAuditLog({
        area: 'Master Directory',
        action_type: 'updated',
        entity_label: 'Sync All from Bios',
        changed_by: user?.email || '',
        metadata: { synced_count: synced },
      });
      await loadData();
    } else {
      toast({ title: 'Sync Failed', description: error || 'Failed to sync profiles.', variant: 'destructive' });
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-muted-foreground">Access denied. Admin access only.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader
          title="Master Directory"
          description="Centralized agent configuration reference (read-only synced from Bios)"
        >
          <PageGuideButton pageId="master-directory" />
          <Button data-tour="sync-button" onClick={handleSyncAll} disabled={isSyncing || isSaving} variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync from Bios'}
          </Button>
          <Button
            data-tour="save-button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              'transition-all',
              hasChanges ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            )}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save All'}
          </Button>
        </PageHeader>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3" data-tour="filter-bar">
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          <Select value={teamLeadFilter} onValueChange={setTeamLeadFilter}>
            <SelectTrigger className="w-[160px] bg-background border-border">
              <SelectValue placeholder="Team Lead" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="all">All Team Leads</SelectItem>
              {filterOptions.teamLeads.map((lead) => (
                <SelectItem key={lead} value={lead}>{lead}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={zdInstanceFilter} onValueChange={setZdInstanceFilter}>
            <SelectTrigger className="w-[140px] bg-background border-border">
              <SelectValue placeholder="ZD Instance" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="all">All Instances</SelectItem>
              {filterOptions.zdInstances.map((inst) => (
                <SelectItem key={inst} value={inst}>{inst}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[150px] bg-background border-border">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="all">All Positions</SelectItem>
              {filterOptions.positionCategories.map((pos) => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Reset
              {columnFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{columnFilterCount}</Badge>
              )}
            </Button>
          )}
        </div>

        {/* Table */}
        <div
          className="border rounded-lg overflow-auto data-table-scroll"
          style={{ height: 'calc(100vh - 220px)' }}
          data-tour="directory-table"
        >
          <div className="min-w-[2000px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  {/* Row number / link column - not filterable */}
                  <th className="min-w-[50px] sticky left-0 top-0 z-30 bg-muted h-12 px-4 text-left align-middle font-medium text-muted-foreground" />

                  {/* Full Name - frozen */}
                  <FilterableColumnHeader
                    columnKey="full_name"
                    label="Full Name"
                    filterType="categorical"
                    uniqueValues={columnMeta.full_name?.uniqueValues}
                    activeFilter={columnFilters.full_name}
                    sortDirection={sortConfig?.column === 'full_name' ? sortConfig.direction : null}
                    onFilterChange={handleColumnFilterChange}
                    onSortChange={handleSortChange}
                    className="min-w-[150px] sticky left-[50px] top-0 z-30 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                  />

                  {/* Remaining columns */}
                  {COLUMNS.slice(1).map(col => (
                    <FilterableColumnHeader
                      key={col.key}
                      columnKey={col.key}
                      label={col.label}
                      filterType={col.type}
                      uniqueValues={columnMeta[col.key]?.uniqueValues}
                      numericRange={columnMeta[col.key]?.numericRange}
                      activeFilter={columnFilters[col.key]}
                      sortDirection={sortConfig?.column === col.key ? sortConfig.direction : null}
                      onFilterChange={handleColumnFilterChange}
                      onSortChange={handleSortChange}
                      className={cn('sticky top-0 z-20 bg-muted', `min-w-[${col.minWidth}]`)}
                      style={{ minWidth: col.minWidth }}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.email}>
                    {/* Dashboard link */}
                    <TableCell className="sticky left-0 z-10 bg-background">
                      {entry.profile_id && (
                        <Link to={`/people/${entry.profile_id}/dashboard`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Open Dashboard">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>

                    {/* Full Name - frozen */}
                    <TableCell className="font-medium sticky left-[50px] z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      {entry.full_name || '-'}
                    </TableCell>

                    {/* Read-only synced fields */}
                    <TableCell className="text-muted-foreground">{entry.position || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.team_lead || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.zendesk_instance || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.support_account || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-center">{entry.quota ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.agent_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.agent_tag || '-'}</TableCell>

                    {/* Ticket Assignment Toggle */}
                    <TableCell>
                      {(() => {
                        const isZD2orNull = !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';
                        return (
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      checked={!isZD2orNull && (entry.ticket_assignment_enabled || false)}
                                      onCheckedChange={(checked) => handleTicketAssignmentToggle(entry.email, checked)}
                                      disabled={isZD2orNull}
                                      className={cn(isZD2orNull && 'opacity-50 cursor-not-allowed')}
                                    />
                                  </div>
                                </TooltipTrigger>
                                {isZD2orNull && (
                                  <TooltipContent><p>Not available for ZD2</p></TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                            <span className={cn("text-xs", isZD2orNull ? "text-warning" : "text-muted-foreground")}>
                              {isZD2orNull ? 'ZD2' : (entry.ticket_assignment_enabled ? 'On' : 'Off')}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Assignment View Dropdown */}
                    <TableCell>
                      {(() => {
                        const isZD2orNull = !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';
                        const isDisabled = isZD2orNull || !entry.ticket_assignment_enabled;
                        const availableViews = viewConfigs.filter(v => v.zendesk_instance === entry.zendesk_instance);
                        return (
                          <Select
                            value={entry.ticket_assignment_view_id || 'none'}
                            onValueChange={(val) => updateField(entry.email, 'ticket_assignment_view_id', val === 'none' ? null : val)}
                            disabled={isDisabled}
                          >
                            <SelectTrigger className={cn("h-8 w-[140px]", isDisabled && "opacity-50 cursor-not-allowed bg-muted")}>
                              <SelectValue placeholder="Auto" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border z-50">
                              <SelectItem value="none">Auto (by type)</SelectItem>
                              {availableViews.map((vc) => (
                                <SelectItem key={vc.view_id} value={vc.view_id}>{vc.view_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>

                    {/* Weekday Schedule */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekday_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekday_total_hours.toFixed(1)}</TableCell>

                    {/* WD Ticket Assign */}
                    <TableCell>
                      {(() => {
                        const isZD2orNull = !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Input
                                    value={isZD2orNull ? '' : (entry.wd_ticket_assign || '')}
                                    onChange={(e) => updateField(entry.email, 'wd_ticket_assign', e.target.value)}
                                    className={cn("h-8 w-[90px]", isZD2orNull && "opacity-50 cursor-not-allowed bg-muted")}
                                    disabled={isZD2orNull}
                                    placeholder={isZD2orNull ? '-' : ''}
                                  />
                                </div>
                              </TooltipTrigger>
                              {isZD2orNull && (
                                <TooltipContent><p>Not available for ZD2</p></TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>

                    {/* Weekend Schedule */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekend_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekend_total_hours.toFixed(1)}</TableCell>

                    {/* WE Ticket Assign */}
                    <TableCell>
                      {(() => {
                        const isZD2orNull = !entry.zendesk_instance || entry.zendesk_instance === 'ZD2';
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Input
                                    value={isZD2orNull ? '' : (entry.we_ticket_assign || '')}
                                    onChange={(e) => updateField(entry.email, 'we_ticket_assign', e.target.value)}
                                    className={cn("h-8 w-[90px]", isZD2orNull && "opacity-50 cursor-not-allowed bg-muted")}
                                    disabled={isZD2orNull}
                                    placeholder={isZD2orNull ? '-' : ''}
                                  />
                                </div>
                              </TooltipTrigger>
                              {isZD2orNull && (
                                <TooltipContent><p>Not available for ZD2</p></TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>

                    {/* Break & OT Schedules */}
                    <TableCell className="text-muted-foreground text-xs">{entry.break_schedule || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{entry.weekday_ot_schedule || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{entry.weekend_ot_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.ot_total_hours.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">{entry.overall_total_hours.toFixed(1)}</TableCell>

                    {/* Day Off */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(entry.day_off || []).length > 0 ? (
                          entry.day_off.map((day) => (
                            <Badge key={day} variant="secondary" className="text-xs">{day}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredEntries.length === 0 && (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No agents found"
            description="Try adjusting your search or filter criteria"
            className="py-12"
          />
        )}
      </div>
    </Layout>
  );
}
