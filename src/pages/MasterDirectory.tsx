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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { Save, Search, ChevronDown, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DirectoryEntry,
  fetchAllDirectoryEntries,
  bulkSaveEntries,
  validateScheduleFormat,
  calculateTotalHours,
  fetchAllDropdownOptions,
} from '@/lib/masterDirectoryApi';

const SUPPORT_TYPE_OPTIONS = ['Email', 'Chat', 'Call', 'Hybrid'];

export default function MasterDirectory() {
  const { user, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originalData, setOriginalData] = useState<DirectoryEntry[]>([]);
  const [editedData, setEditedData] = useState<DirectoryEntry[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Dynamic dropdown options
  const [zendeskOptions, setZendeskOptions] = useState<string[]>([]);
  const [supportAccountOptions, setSupportAccountOptions] = useState<string[]>([]);
  const [viewOptions, setViewOptions] = useState<string[]>([]);
  const [dayOffOptions, setDayOffOptions] = useState<string[]>([]);
  

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return editedData.some((entry) => {
      const original = originalData.find((o) => o.email === entry.email);
      if (!original) return false;
      return JSON.stringify(entry) !== JSON.stringify(original);
    });
  }, [editedData, originalData]);

  // Load data and dropdown options on mount
  useEffect(() => {
    loadData();
    loadDropdownOptions();
  }, []);
  

  const loadDropdownOptions = async () => {
    const options = await fetchAllDropdownOptions();
    setZendeskOptions(options.zendesk_instances);
    setSupportAccountOptions(options.support_accounts);
    setViewOptions(options.view_options);
    setDayOffOptions(options.day_off_options);
  };

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

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return editedData;
    const query = searchQuery.toLowerCase();
    return editedData.filter(
      (entry) =>
        entry.full_name?.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query)
    );
  }, [editedData, searchQuery]);

  // Update a single field for an entry
  const updateField = (email: string, field: keyof DirectoryEntry, value: any) => {
    setEditedData((prev) =>
      prev.map((entry) => {
        if (entry.email.toLowerCase() !== email.toLowerCase()) return entry;
        
        const updated = { ...entry, [field]: value };
        
        // Recalculate hours if schedule changed
        if (
          field === 'weekday_schedule' ||
          field === 'weekend_schedule' ||
          field === 'weekday_ot_schedule' ||
          field === 'weekend_ot_schedule'
        ) {
          const hours = calculateTotalHours(updated);
          return { ...updated, ...hours };
        }
        
        return updated;
      })
    );
    
    // Validate schedule fields
    if (
      field === 'weekday_schedule' ||
      field === 'weekend_schedule' ||
      field === 'break_schedule' ||
      field === 'weekday_ot_schedule' ||
      field === 'weekend_ot_schedule'
    ) {
      if (value && !validateScheduleFormat(value)) {
        setValidationErrors((prev) => ({
          ...prev,
          [email]: [...(prev[email] || []).filter((f) => f !== field), field],
        }));
      } else {
        setValidationErrors((prev) => ({
          ...prev,
          [email]: (prev[email] || []).filter((f) => f !== field),
        }));
      }
    }
  };

  // Toggle array values (for views and day_off)
  const toggleArrayValue = (email: string, field: 'views' | 'day_off', value: string) => {
    setEditedData((prev) =>
      prev.map((entry) => {
        if (entry.email.toLowerCase() !== email.toLowerCase()) return entry;
        const currentArray = entry[field] || [];
        const newArray = currentArray.includes(value)
          ? currentArray.filter((v) => v !== value)
          : [...currentArray, value];
        return { ...entry, [field]: newArray };
      })
    );
  };

  // Handle save
  const handleSave = async () => {
    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some((errors) => errors.length > 0);
    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix schedule format errors before saving.',
        variant: 'destructive',
      });
      return;
    }

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
              Centralized agent configuration reference
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
          <div className="min-w-[2200px]">
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
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Views</TableHead>
                  <TableHead className="min-w-[120px] sticky top-0 z-20 bg-muted">Ticket Assignment View ID</TableHead>
                  <TableHead className="min-w-[140px] sticky top-0 z-20 bg-muted">Weekday Schedule</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Total Hours</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">WD Ticket Assign</TableHead>
                  <TableHead className="min-w-[140px] sticky top-0 z-20 bg-muted">Weekend Schedule</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Total Hours</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">WE Ticket Assign</TableHead>
                  <TableHead className="min-w-[130px] sticky top-0 z-20 bg-muted">Break Schedule</TableHead>
                  <TableHead className="min-w-[140px] sticky top-0 z-20 bg-muted">Weekday OT Schedule</TableHead>
                  <TableHead className="min-w-[140px] sticky top-0 z-20 bg-muted">Weekend OT Schedule</TableHead>
                  <TableHead className="min-w-[80px] sticky top-0 z-20 bg-muted">Total OT Hours</TableHead>
                  <TableHead className="min-w-[100px] sticky top-0 z-20 bg-muted">Overall Total Hours</TableHead>
                  <TableHead className="min-w-[150px] sticky top-0 z-20 bg-muted">Day Off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.email}>
                    {/* Dashboard link - uses profile_id from agent_profiles */}
                    <TableCell className="sticky left-0 z-10 bg-background">
                      {entry.profile_id && (
                        <Link to={`/people/${entry.profile_id}/dashboard`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Open Dashboard">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                    {/* Read-only columns from agent_profiles */}
                    <TableCell className="font-medium sticky left-[50px] z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                      {entry.full_name || '-'}
                    </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.position || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.team_lead || '-'}
                      </TableCell>

                      {/* Editable columns */}
                      <TableCell>
                        <Select
                          value={entry.zendesk_instance || ''}
                          onValueChange={(value) =>
                            updateField(entry.email, 'zendesk_instance', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[90px]">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {zendeskOptions.map((instance) => (
                              <SelectItem key={instance} value={instance}>
                                {instance}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={entry.support_account || ''}
                          onValueChange={(value) =>
                            updateField(entry.email, 'support_account', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {supportAccountOptions.map((account) => (
                              <SelectItem key={account} value={account}>
                                {account}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Support Type */}
                      <TableCell>
                        <Select
                          value={entry.support_type || 'Email'}
                          onValueChange={(value) =>
                            updateField(entry.email, 'support_type', value)
                          }
                        >
                          <SelectTrigger className="h-8 w-[90px]">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORT_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Quota */}
                      <TableCell>
                        <Input
                          type="number"
                          value={entry.quota ?? ''}
                          onChange={(e) =>
                            updateField(entry.email, 'quota', e.target.value ? Number(e.target.value) : null)
                          }
                          className="h-8 w-[70px]"
                          min={0}
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          value={entry.agent_name || ''}
                          onChange={(e) =>
                            updateField(entry.email, 'agent_name', e.target.value)
                          }
                          className="h-8 w-[110px]"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          value={entry.agent_tag || ''}
                          onChange={(e) =>
                            updateField(entry.email, 'agent_tag', e.target.value)
                          }
                          className="h-8 w-[90px]"
                        />
                      </TableCell>

                      {/* Multi-select: Views */}
                      <TableCell>
                        <MultiSelectDropdown
                          options={viewOptions}
                          selected={entry.views || []}
                          onToggle={(value) =>
                            toggleArrayValue(entry.email, 'views', value)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          value={entry.ticket_assignment_view_id || ''}
                          onChange={(e) =>
                            updateField(
                              entry.email,
                              'ticket_assignment_view_id',
                              e.target.value
                            )
                          }
                          className="h-8 w-[110px]"
                        />
                      </TableCell>

                      {/* Schedule fields with validation */}
                      <TableCell>
                        <ScheduleInput
                          value={entry.weekday_schedule || ''}
                          onChange={(value) =>
                            updateField(entry.email, 'weekday_schedule', value)
                          }
                          hasError={validationErrors[entry.email]?.includes(
                            'weekday_schedule'
                          )}
                        />
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {entry.weekday_total_hours.toFixed(1)}
                      </TableCell>

                      <TableCell>
                        <Input
                          value={entry.wd_ticket_assign || ''}
                          onChange={(e) =>
                            updateField(entry.email, 'wd_ticket_assign', e.target.value)
                          }
                          className="h-8 w-[90px]"
                        />
                      </TableCell>

                      <TableCell>
                        <ScheduleInput
                          value={entry.weekend_schedule || ''}
                          onChange={(value) =>
                            updateField(entry.email, 'weekend_schedule', value)
                          }
                          hasError={validationErrors[entry.email]?.includes(
                            'weekend_schedule'
                          )}
                        />
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {entry.weekend_total_hours.toFixed(1)}
                      </TableCell>

                      <TableCell>
                        <Input
                          value={entry.we_ticket_assign || ''}
                          onChange={(e) =>
                            updateField(entry.email, 'we_ticket_assign', e.target.value)
                          }
                          className="h-8 w-[90px]"
                        />
                      </TableCell>

                      <TableCell>
                        <ScheduleInput
                          value={entry.break_schedule || ''}
                          onChange={(value) =>
                            updateField(entry.email, 'break_schedule', value)
                          }
                          hasError={validationErrors[entry.email]?.includes(
                            'break_schedule'
                          )}
                        />
                      </TableCell>

                      <TableCell>
                        <ScheduleInput
                          value={entry.weekday_ot_schedule || ''}
                          onChange={(value) =>
                            updateField(entry.email, 'weekday_ot_schedule', value)
                          }
                          hasError={validationErrors[entry.email]?.includes(
                            'weekday_ot_schedule'
                          )}
                        />
                      </TableCell>

                      <TableCell>
                        <ScheduleInput
                          value={entry.weekend_ot_schedule || ''}
                          onChange={(value) =>
                            updateField(entry.email, 'weekend_ot_schedule', value)
                          }
                          hasError={validationErrors[entry.email]?.includes(
                            'weekend_ot_schedule'
                          )}
                        />
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {entry.ot_total_hours.toFixed(1)}
                      </TableCell>

                      <TableCell className="text-center font-semibold text-primary">
                        {entry.overall_total_hours.toFixed(1)}
                      </TableCell>

                      {/* Multi-select: Day Off */}
                      <TableCell>
                        <MultiSelectDropdown
                          options={dayOffOptions}
                          selected={entry.day_off || []}
                          onToggle={(value) =>
                            toggleArrayValue(entry.email, 'day_off', value)
                          }
                        />
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

// Schedule input with validation indicator
function ScheduleInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="8:00 AM-5:00 PM"
        className={cn(
          'h-8 w-[130px]',
          hasError && 'border-destructive focus-visible:ring-destructive'
        )}
      />
      {hasError && (
        <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
      )}
    </div>
  );
}

// Multi-select dropdown for arrays
function MultiSelectDropdown({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-[110px] justify-between text-xs">
          {selected.length > 0 ? (
            <span className="truncate">{selected.join(', ')}</span>
          ) : (
            <span className="text-muted-foreground">Select...</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-2" align="start">
        <div className="space-y-1">
          {options.map((option) => (
            <div
              key={option}
              className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer"
              onClick={() => onToggle(option)}
            >
              <Checkbox checked={selected.includes(option)} />
              <span className="text-sm">{option}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
