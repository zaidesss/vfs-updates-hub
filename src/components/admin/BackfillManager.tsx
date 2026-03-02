import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { DatePicker, formatDisplayDateTime } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square, Loader2, RefreshCw, Database, AlertTriangle, RotateCw, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface BackfillJob {
  id: string;
  zendesk_instance_name: string;
  job_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  cursor_unix: number | null;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  last_ticket_id: number | null;
  error: string | null;
  dry_run: boolean;
}

export function BackfillManager() {
  const [mode, setMode] = useState<'email_only' | 'messaging_convert_optional'>('email_only');
  const [startDate, setStartDate] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<BackfillJob | null>(null);
  const [jobs, setJobs] = useState<BackfillJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const chainRef = useRef(false);
  const abortRef = useRef(false);

  // Reconciliation state
  const [reconAgentName, setReconAgentName] = useState('');
  const [reconAgentEmail, setReconAgentEmail] = useState('');
  const [reconStartDate, setReconStartDate] = useState('');
  const [reconEndDate, setReconEndDate] = useState('');
  const [reconDryRun, setReconDryRun] = useState(true);
  const [isReconRunning, setIsReconRunning] = useState(false);
  const [reconResult, setReconResult] = useState<any>(null);

  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    const { data, error } = await supabase
      .from('zd_backfill_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);
    setIsLoadingJobs(false);

    if (!error && data) {
      setJobs(data as unknown as BackfillJob[]);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const invokeBackfill = async (params: {
    mode: string;
    start_time_unix: number;
    dry_run: boolean;
    job_id?: string;
    resume?: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke('zd-backfill-email-counted', {
      body: {
        zendesk_instance_name: 'customerserviceadvocateshelp',
        max_pages: 5,
        per_page: 100,
        ...params,
      },
    });

    if (error) throw new Error(error.message || 'Function invocation failed');
    return data;
  };

  const startBackfill = async () => {
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
    setIsRunning(true);
    chainRef.current = true;
    abortRef.current = false;

    try {
      const result = await invokeBackfill({
        mode,
        start_time_unix: startUnix,
        dry_run: dryRun,
      });

      setCurrentJob(prev => ({
        ...(prev || {} as BackfillJob),
        id: result.job_id,
        status: result.status,
        processed: result.processed,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        dry_run: dryRun,
        job_type: mode,
        zendesk_instance_name: 'customerserviceadvocateshelp',
        started_at: new Date().toISOString(),
        finished_at: null,
        cursor_unix: result.cursor_unix,
        last_ticket_id: null,
        error: null,
      }));

      // Auto-chain
      if (result.has_more && chainRef.current && !abortRef.current) {
        await autoChain(result.job_id, mode, dryRun);
      } else {
        setIsRunning(false);
        toast.success(`Backfill ${result.status}`, {
          description: `Processed: ${result.processed}, Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
        });
      }
    } catch (err: any) {
      setIsRunning(false);
      toast.error('Backfill failed', { description: err.message });
    }

    loadJobs();
  };

  const autoChain = async (jobId: string, jobMode: string, jobDryRun: boolean) => {
    while (chainRef.current && !abortRef.current) {
      await new Promise(r => setTimeout(r, 2000));
      if (abortRef.current) break;

      try {
        const result = await invokeBackfill({
          mode: jobMode,
          start_time_unix: 0, // ignored on resume
          dry_run: jobDryRun,
          job_id: jobId,
          resume: true,
        });

        setCurrentJob(prev => prev ? {
          ...prev,
          status: result.status,
          processed: result.processed,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
          cursor_unix: result.cursor_unix,
        } : prev);

        if (!result.has_more) {
          setIsRunning(false);
          chainRef.current = false;
          toast.success(`Backfill ${result.status}`, {
            description: `Processed: ${result.processed}, Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
          });
          break;
        }
      } catch (err: any) {
        setIsRunning(false);
        chainRef.current = false;
        toast.error('Backfill batch failed', { description: err.message });
        break;
      }
    }
    loadJobs();
  };

  const stopChain = () => {
    abortRef.current = true;
    chainRef.current = false;
    setIsRunning(false);
    toast.info('Backfill stopped — will finish current batch');
  };

  const resumeJob = async (job: BackfillJob) => {
    setIsRunning(true);
    chainRef.current = true;
    abortRef.current = false;

    setCurrentJob({ ...job, status: 'Running', finished_at: null });

    try {
      const result = await invokeBackfill({
        mode: job.job_type,
        start_time_unix: 0,
        dry_run: job.dry_run,
        job_id: job.id,
        resume: true,
      });

      setCurrentJob(prev => prev ? {
        ...prev,
        status: result.status,
        processed: result.processed,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        cursor_unix: result.cursor_unix,
      } : prev);

      if (result.has_more && chainRef.current && !abortRef.current) {
        await autoChain(job.id, job.job_type, job.dry_run);
      } else {
        setIsRunning(false);
        toast.success(`Backfill ${result.status}`, {
          description: `Processed: ${result.processed}, Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors}`,
        });
      }
    } catch (err: any) {
      setIsRunning(false);
      toast.error('Resume failed', { description: err.message });
    }

    loadJobs();
  };

  const startReconciliation = async () => {
    if (!reconAgentName || !reconAgentEmail || !reconStartDate || !reconEndDate) {
      toast.error('Please fill in all reconciliation fields');
      return;
    }

    setIsReconRunning(true);
    setReconResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('zd-reconcile-converted-emails', {
        body: {
          agent_name: reconAgentName,
          agent_email: reconAgentEmail,
          start_date: reconStartDate,
          end_date: reconEndDate,
          dry_run: reconDryRun,
        },
      });

      if (error) throw new Error(error.message || 'Reconciliation failed');

      setReconResult(data);
      toast.success(`Reconciliation ${data.dry_run ? '(Dry Run) ' : ''}Complete`, {
        description: `Processed: ${data.processed}, Inserted: ${data.inserted}, Skipped: ${data.skipped}, Errors: ${data.errors}`,
      });
    } catch (err: any) {
      toast.error('Reconciliation failed', { description: err.message });
    } finally {
      setIsReconRunning(false);
      loadJobs();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Running: 'default',
      Paused: 'secondary',
      Completed: 'outline',
      Error: 'destructive',
      Cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Backfill Tags Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backfill email_counted Tags (ZD2)
          </CardTitle>
          <CardDescription>
            Tag legacy Zendesk tickets so Trigger 4 works correctly. ZD2 (customerserviceadvocateshelp) only. Includes all ticket statuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Instance</Label>
              <div className="text-sm text-muted-foreground border rounded-md p-2 bg-muted">
                ZD2 — customerserviceadvocateshelp
              </div>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Scan tickets from..."
                maxYear={2026}
                minYear={2020}
              />
            </div>

            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_only">Email Only</SelectItem>
                  <SelectItem value="messaging_convert_optional">Messaging Convert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dry Run</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
                <span className="text-sm text-muted-foreground">
                  {dryRun ? 'Preview only' : 'Live — will tag tickets'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation warning when running */}
          {isRunning && (
            <Alert variant="destructive" className="border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Backfill in progress</strong> — Do not navigate away from this page. The auto-chain will stop if you leave.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <Button onClick={startBackfill} disabled={!startDate}>
                <Play className="h-4 w-4 mr-2" />
                Start Backfill
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopChain}>
                <Square className="h-4 w-4 mr-2" />
                Stop Auto-Chain
              </Button>
            )}
            <Button variant="outline" onClick={loadJobs} disabled={isLoadingJobs}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingJobs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Live progress */}
          {currentJob && isRunning && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Running batch...</span>
                  {currentJob.dry_run && <Badge variant="outline">DRY RUN</Badge>}
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Processed</span>
                    <p className="font-semibold text-lg">{currentJob.processed}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated</span>
                    <p className="font-semibold text-lg text-green-600">{currentJob.updated}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped</span>
                    <p className="font-semibold text-lg">{currentJob.skipped}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors</span>
                    <p className="font-semibold text-lg text-destructive">{currentJob.errors}</p>
                  </div>
                </div>
                {currentJob.processed > 0 && (
                  <Progress
                    value={((currentJob.updated + currentJob.skipped) / currentJob.processed) * 100}
                    className="h-2"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Reconciliation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Reconcile Chat-to-Email Conversions (ZD2)
          </CardTitle>
          <CardDescription>
            Find messaging/chat tickets with 2+ public agent replies that were never counted as Email in ticket logs. Inserts missing Email entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Agent Name (tag)</Label>
              <Input
                value={reconAgentName}
                onChange={(e) => setReconAgentName(e.target.value)}
                placeholder="e.g. nikki"
              />
            </div>
            <div className="space-y-2">
              <Label>Agent Email</Label>
              <Input
                value={reconAgentEmail}
                onChange={(e) => setReconAgentEmail(e.target.value)}
                placeholder="e.g. agent@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={reconStartDate}
                onChange={setReconStartDate}
                placeholder="From..."
                maxYear={2026}
                minYear={2020}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                value={reconEndDate}
                onChange={setReconEndDate}
                placeholder="To..."
                maxYear={2026}
                minYear={2020}
              />
            </div>
            <div className="space-y-2">
              <Label>Dry Run</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={reconDryRun} onCheckedChange={setReconDryRun} />
                <span className="text-sm text-muted-foreground">
                  {reconDryRun ? 'Preview only' : 'Live — will insert logs'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={startReconciliation} disabled={isReconRunning || !reconAgentName || !reconAgentEmail || !reconStartDate || !reconEndDate}>
              {isReconRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Run Reconciliation
                </>
              )}
            </Button>
          </div>

          {/* Reconciliation result */}
          {reconResult && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Reconciliation Result</span>
                  {reconResult.dry_run && <Badge variant="outline">DRY RUN</Badge>}
                  <Badge variant="outline">
                    {reconResult.agent_name} · {reconResult.start_date} → {reconResult.end_date}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Processed</span>
                    <p className="font-semibold text-lg">{reconResult.processed}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inserted</span>
                    <p className="font-semibold text-lg text-green-600">{reconResult.inserted}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped</span>
                    <p className="font-semibold text-lg">{reconResult.skipped}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors</span>
                    <p className="font-semibold text-lg text-destructive">{reconResult.errors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Jobs history (shared) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Dry Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs">{formatDisplayDateTime(job.started_at)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {job.job_type === 'reconcile_converted' ? 'Reconcile' : job.job_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.processed}</TableCell>
                      <TableCell className="text-green-600">{job.updated}</TableCell>
                      <TableCell>{job.skipped}</TableCell>
                      <TableCell className={job.errors > 0 ? 'text-destructive' : ''}>{job.errors}</TableCell>
                      <TableCell>{job.dry_run ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        {(job.status === 'Paused' || job.status === 'Running') && !isRunning && job.job_type !== 'reconcile_converted' && (
                          <Button size="sm" variant="outline" onClick={() => resumeJob(job)}>
                            <RotateCw className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
