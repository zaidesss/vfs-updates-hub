import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchTicketLogs, fetchUniqueAgents, TicketLog } from '@/lib/ticketLogsApi';

const ZD_INSTANCES = [
  { value: 'all', label: 'All Instances' },
  { value: 'customerserviceadvocates', label: 'ZD1 - Customer Service Advocates' },
  { value: 'customerserviceadvocateshelp', label: 'ZD2 - Customer Service Advocates Help' },
];

export function TicketSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedZdInstance, setSelectedZdInstance] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [agents, setAgents] = useState<string[]>([]);
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchUniqueAgents().then(setAgents);
  }, []);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const results = await fetchTicketLogs({
        searchTerm: searchTerm || undefined,
        agentName: selectedAgent !== 'all' ? selectedAgent : undefined,
        ticketType: selectedType !== 'all' ? selectedType : undefined,
        zdInstance: selectedZdInstance !== 'all' ? selectedZdInstance : undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      });
      setLogs(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAgent('all');
    setSelectedType('all');
    setSelectedZdInstance('all');
    setStartDate('');
    setEndDate('');
    setLogs([]);
    setHasSearched(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'solved' || lower === 'closed') return 'default';
    if (lower === 'pending') return 'secondary';
    if (lower === 'open' || lower === 'new') return 'destructive';
    return 'outline';
  };

  const getTypeBadgeClass = (type: string) => {
    const lower = type.toLowerCase();
    if (lower === 'email') return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    if (lower === 'chat') return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
    if (lower === 'call') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    return '';
  };

  const getInstanceLabel = (value: string) => {
    const instance = ZD_INSTANCES.find(i => i.value === value);
    return instance?.label || value;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Search & Filter Tickets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ticket ID, agent name, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Agent</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ticket Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Chat">Chat</SelectItem>
                <SelectItem value="Call">Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">ZD Instance</label>
            <Select value={selectedZdInstance} onValueChange={setSelectedZdInstance}>
              <SelectTrigger>
                <SelectValue placeholder="All Instances" />
              </SelectTrigger>
              <SelectContent>
                {ZD_INSTANCES.map((instance) => (
                  <SelectItem key={instance.value} value={instance.value}>
                    {instance.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Start Date</label>
            <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">End Date</label>
            <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
          </div>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">
                Results ({logs.length} tickets)
              </h3>
            </div>

            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tickets found matching your criteria.
              </p>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>ZD Instance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {log.ticket_id}
                        </TableCell>
                        <TableCell>{log.agent_name}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeClass(log.ticket_type)} variant="outline">
                            {log.ticket_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.zd_instance === 'customerserviceadvocates' ? 'ZD1' : 'ZD2'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
