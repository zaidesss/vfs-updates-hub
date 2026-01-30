import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Save, Search, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DirectoryEntry,
  fetchAllDirectoryEntries,
  bulkSaveEntries,
} from '@/lib/masterDirectoryApi';
import { supabase } from '@/integrations/supabase/client';

export default function MasterDirectory() {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originalData, setOriginalData] = useState<DirectoryEntry[]>([]);
  const [editedData, setEditedData] = useState<DirectoryEntry[]>([]);

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
    const { data, error } = await fetchAllDirectoryEntries();
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else if (data) {
      setOriginalData(data);
      setEditedData(JSON.parse(JSON.stringify(data)));
    }
    setIsLoading(false);
  };

  // Filter entries based on search and exclude terminated profiles
  const filteredEntries = useMemo(() => {
    let result = editedData;
    
    // Exclude terminated profiles
    result = result.filter(entry => entry.employment_status !== 'Terminated');
    
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
  }, [editedData, searchQuery]);

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
      // Refresh data to get updated timestamps
      await loadData();
    } else {
      toast({
        title: 'Error',
        description: error || 'Failed to save changes.',
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
          <Button
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table with sticky header and frozen first column */}
        <div 
          className="border rounded-lg overflow-auto data-table-scroll"
          style={{ height: 'calc(100vh - 220px)' }}
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
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Support Type</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Quota</TableHead>
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Agent Name</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Agent Tag</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Views</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Ticket Assignment</TableHead>
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
                    <TableCell className="text-muted-foreground">{entry.support_type || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-center">{entry.quota ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.agent_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.agent_tag || '-'}</TableCell>
                    
                    {/* Views - read-only badges */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(entry.views || []).length > 0 ? (
                          entry.views.map((view) => (
                            <Badge key={view} variant="outline" className="text-xs">{view}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Ticket Assignment Toggle - EDITABLE */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={entry.ticket_assignment_enabled || false}
                          onCheckedChange={(checked) => handleTicketAssignmentToggle(entry.email, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {entry.ticket_assignment_enabled ? 'On' : 'Off'}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Weekday Schedule - read-only */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekday_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekday_total_hours.toFixed(1)}</TableCell>
                    
                    {/* WD Ticket Assign - EDITABLE */}
                    <TableCell>
                      <Input
                        value={entry.wd_ticket_assign || ''}
                        onChange={(e) => updateField(entry.email, 'wd_ticket_assign', e.target.value)}
                        className="h-8 w-[90px]"
                      />
                    </TableCell>
                    
                    {/* Weekend Schedule - read-only */}
                    <TableCell className="text-muted-foreground text-xs">{entry.weekend_schedule || '-'}</TableCell>
                    <TableCell className="text-center font-medium">{entry.weekend_total_hours.toFixed(1)}</TableCell>
                    
                    {/* WE Ticket Assign - EDITABLE */}
                    <TableCell>
                      <Input
                        value={entry.we_ticket_assign || ''}
                        onChange={(e) => updateField(entry.email, 'we_ticket_assign', e.target.value)}
                        className="h-8 w-[90px]"
                      />
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