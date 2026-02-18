import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, FileText, Megaphone, Search, Filter, Loader2 } from 'lucide-react';
import { fetchAuditLogs, AuditLogEntry, AuditLogFilters, AUDIT_AREAS, ACTION_TYPES } from '@/lib/auditLogApi';
import { format } from 'date-fns';
import { getKnownNameByEmail } from '@/lib/nameDirectory';

const ACTION_TYPE_COLORS: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  new_feature: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

function ActionBadge({ type }: { type: string }) {
  return (
    <Badge className={`${ACTION_TYPE_COLORS[type] || ''} border-0 capitalize`}>
      {type === 'new_feature' ? 'New Feature' : type}
    </Badge>
  );
}

function ChangeDetails({ changes }: { changes: Record<string, { old: string | null; new: string | null }> | null }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <p className="text-sm text-muted-foreground italic">No detailed changes recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {Object.entries(changes).map(([field, diff]) => (
        <div key={field} className="text-sm">
          <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
          <div className="ml-4 flex flex-col gap-0.5">
            {diff.old !== null && (
              <span className="text-red-600 dark:text-red-400 line-through">
                {String(diff.old).substring(0, 200)}
              </span>
            )}
            {diff.new !== null && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {String(diff.new).substring(0, 200)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditLogRow({ entry, isSuperAdmin }: { entry: AuditLogEntry; isSuperAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = getKnownNameByEmail(entry.changed_by) || entry.changed_by;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="w-8">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
        </TableCell>
        <TableCell className="font-medium text-sm">{displayName}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{entry.area}</Badge>
        </TableCell>
        <TableCell>
          <ActionBadge type={entry.action_type} />
        </TableCell>
        <TableCell className="text-sm max-w-[200px] truncate">
          {entry.entity_label || '—'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {entry.reference_number || '—'}
        </TableCell>
        {isSuperAdmin && (
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                title="Create Update from this log"
              >
                <FileText className="h-3 w-3 mr-1" />
                Update
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                title="Create Announcement from this log"
              >
                <Megaphone className="h-3 w-3 mr-1" />
                Announce
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={isSuperAdmin ? 8 : 7} className="p-0">
            <div className="px-12 py-4 bg-muted/30 border-b">
              <ChangeDetails changes={entry.changes} />
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Additional Context</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AuditLog() {
  const { user, isAdmin, isHR, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchBy, setSearchBy] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    const data = await fetchAuditLogs({ ...filters, changedBy: searchBy || undefined });
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [filters]);

  // Redirect non-admin/HR users
  if (!isAdmin && !isHR) {
    return <Navigate to="/updates" replace />;
  }

  const handleSearch = () => {
    loadLogs();
  };

  const clearFilters = () => {
    setFilters({});
    setSearchBy('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Centralized view of all portal changes and actions.</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Area</label>
                <Select
                  value={filters.area || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, area: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {AUDIT_AREAS.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
                <Select
                  value={filters.actionType || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, actionType: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {ACTION_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type === 'new_feature' ? 'New Feature' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                />
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Changed By</label>
                <div className="flex gap-1">
                  <Input
                    className="h-9"
                    placeholder="Search by email..."
                    value={searchBy}
                    onChange={(e) => setSearchBy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button variant="outline" size="sm" className="h-9 px-2" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Log Entries
              <span className="text-sm font-normal text-muted-foreground">({logs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No audit log entries found.</p>
                <p className="text-sm mt-1">Logs will appear here as portal changes are recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>When</TableHead>
                      <TableHead>Who</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>What</TableHead>
                      <TableHead>Ref #</TableHead>
                      {isSuperAdmin && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(entry => (
                      <AuditLogRow key={entry.id} entry={entry} isSuperAdmin={isSuperAdmin} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
