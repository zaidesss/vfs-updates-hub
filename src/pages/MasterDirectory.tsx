import { useState, useEffect, useMemo } from 'react';
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
  TableHead,
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

export default function MasterDirectory() {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originalData, setOriginalData] = useState<DirectoryEntry[]>([]);
  const [editedData, setEditedData] = useState<DirectoryEntry[]>([]);
  const [viewConfigs, setViewConfigs] = useState<ViewConfigOption[]>([]);
  
  // Filter states
  const [teamLeadFilter, setTeamLeadFilter] = useState('all');
  const [zdInstanceFilter, setZdInstanceFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');

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
      toast({
        title: 'Error',
        description: directoryResult.error,
        variant: 'destructive',
      });
    } else if (directoryResult.data) {
      setOriginalData(directoryResult.data);
      setEditedData(JSON.parse(JSON.stringify(directoryResult.data)));
    }
    setViewConfigs(configs);
    setIsLoading(false);
  };

  // Extract unique filter options from active entries
  const filterOptions = useMemo(() => {
    const activeEntries = editedData.filter(e => e.employment_status !== 'Terminated');
    
    const teamLeads = [...new Set(activeEntries.map(e => e.team_lead).filter(Boolean))].sort() as string[];
    const zdInstances = [...new Set(activeEntries.map(e => e.zendesk_instance).filter(Boolean))].sort() as string[];
    // Derive position categories from the position field stored in directory entries
    const positionCategories = [...new Set(activeEntries.map(e => e.position).filter(Boolean))].sort() as string[];
    
    return { teamLeads, zdInstances, positionCategories };
  }, [editedData]);

  // Filter entries based on search and exclude terminated profiles
  const filteredEntries = useMemo(() => {
    let result = editedData;
    
    // Exclude terminated profiles
    result = result.filter(entry => entry.employment_status !== 'Terminated');
    
    // Apply dropdown filters
    if (teamLeadFilter !== 'all') {
      result = result.filter(entry => entry.team_lead === teamLeadFilter);
    }
    if (zdInstanceFilter !== 'all') {
      result = result.filter(entry => entry.zendesk_instance === zdInstanceFilter);
    }
    if (positionFilter !== 'all') {
      result = result.filter(entry => entry.position === positionFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.full_name?.toLowerCase().includes(query) ||
          entry.email.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [editedData, searchQuery, teamLeadFilter, zdInstanceFilter, positionFilter]);

  // Reset filters handler
  const resetFilters = () => {
    setTeamLeadFilter('all');
    setZdInstanceFilter('all');
    setPositionFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = teamLeadFilter !== 'all' || 
                           zdInstanceFilter !== 'all' || 
                           positionFilter !== 'all' || 
                           searchQuery.trim() !== '';

  // Update a single field for an entry (only for editable fields)
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
    // Update local state
    updateField(email, 'ticket_assignment_enabled', enabled);
    
    // Also update agent_profiles directly since this is the source of truth for this field
    try {
      await supabase
        .from('agent_profiles')
        .update({ ticket_assignment_enabled: enabled })
        .eq('email', email.toLowerCase());
      
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
    const { success, error } = await bulkSaveEntries(
      editedData,
      originalData,
      user?.email || ''
    );
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Saved',
        description: 'All changes have been saved successfully.',
      });
      // Build summary of changed agents/fields
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
      toast({
        title: 'Error',
        description: error || 'Failed to save changes.',
        variant: 'destructive',
      });
    }
  };

  // Handle sync all from Bios
  const handleSyncAll = async () => {
    setIsSyncing(true);
    const { success, synced, error } = await syncAllProfilesToDirectory();
    setIsSyncing(false);

    if (success) {
      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${synced} profile(s) to Master Directory.`,
      });
      writeAuditLog({
        area: 'Master Directory',
        action_type: 'updated',
        entity_label: 'Sync All from Bios',
        changed_by: user?.email || '',
        metadata: { synced_count: synced },
      });
      await loadData(); // Refresh the data
    } else {
      toast({
        title: 'Sync Failed',
        description: error || 'Failed to sync profiles.',
        variant: 'destructive',
      });
    }
  };

  // Access control
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Master Directory</h1>
            <p className="text-muted-foreground text-sm">
              Centralized agent configuration reference (read-only synced from Bios)
            </p>
          </div>
          <div className="flex gap-2">
            <PageGuideButton pageId="master-directory" />
            <Button
              data-tour="sync-button"
              onClick={handleSyncAll}
              disabled={isSyncing || isSaving}
              variant="outline"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync from Bios'}
            </Button>
            <Button
              data-tour="save-button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={cn(
                'transition-all',
                hasChanges
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3" data-tour="filter-bar">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Team Lead Filter */}
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
          
          {/* Zendesk Instance Filter */}
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
          
          {/* Position Filter */}
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
          
          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Table with sticky header and frozen first column */}
        <div 
          className="border rounded-lg overflow-auto data-table-scroll"
          style={{ height: 'calc(100vh - 220px)' }}
          data-tour="directory-table"
        >
          <div className="min-w-[2000px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="min-w-[50px] sticky left-0 top-0 z-30 bg-muted">
                    
                  </TableHead>
                  <TableHead className="min-w-[150px] sticky left-[50px] top-0 z-30 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                    Full Name
                  </TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Position</TableHead>
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Team Lead</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Zendesk Instance</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Support Account</TableHead>
                  
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Quota</TableHead>
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Agent Name</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Agent Tag</TableHead>
                  
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Ticket Assignment</TableHead>
                  <TableHead className="min-w-[150px] sticky top-0 z-20 bg-muted">Assignment View</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Weekday Schedule</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">WD Hours</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">WD Ticket Assign</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Weekend Schedule</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">WE Hours</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">WE Ticket Assign</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Break Schedule</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Weekday OT</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Weekend OT</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">OT Hours</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Total Hours</TableHead>
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Day Off</TableHead>
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
                    
                    {/* Full Name - frozen column */}
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
                    
                    {/* Ticket Assignment Toggle - EDITABLE (disabled for ZD2) */}
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
                                  <TooltipContent>
                                    <p>Not available for ZD2</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                            <span className={cn(
                              "text-xs",
                              isZD2orNull ? "text-amber-600" : "text-muted-foreground"
                            )}>
                              {isZD2orNull ? 'ZD2' : (entry.ticket_assignment_enabled ? 'On' : 'Off')}
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    
                    {/* Assignment View Dropdown - EDITABLE */}
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
                    
                    {/* Weekday Schedule - read-only */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekday_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekday_total_hours.toFixed(1)}</TableCell>
                    
                    {/* WD Ticket Assign - EDITABLE (disabled for ZD2) */}
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
                                <TooltipContent>
                                  <p>Not available for ZD2</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>
                    
                    {/* Weekend Schedule - read-only */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekend_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekend_total_hours.toFixed(1)}</TableCell>
                    
                    {/* WE Ticket Assign - EDITABLE (disabled for ZD2) */}
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
                                <TooltipContent>
                                  <p>Not available for ZD2</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>
                    
                    {/* Break & OT Schedules - read-only */}
                    <TableCell className="text-muted-foreground text-xs">{entry.break_schedule || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{entry.weekday_ot_schedule || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{entry.weekend_ot_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.ot_total_hours.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">{entry.overall_total_hours.toFixed(1)}</TableCell>
                    
                    {/* Day Off - read-only badges */}
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
          <div className="text-center py-8 text-muted-foreground">
            No agents found.
          </div>
        )}
      </div>
    </Layout>
  );
}