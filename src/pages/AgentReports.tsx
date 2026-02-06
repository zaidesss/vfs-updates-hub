import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { PageGuideButton } from '@/components/PageGuideButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, Eye, ChevronRight, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { ReportFilters } from '@/components/agent-reports/ReportFilters';
import { ReportSummaryCards } from '@/components/agent-reports/ReportSummaryCards';
import { ReportDetailDialog } from '@/components/agent-reports/ReportDetailDialog';
import { AgentAnalyticsPanel } from '@/components/agent-reports/AgentAnalyticsPanel';
import { EODAnalyticsPanel } from '@/components/agent-reports/EODAnalyticsPanel';

import {
  type AgentReport,
  type IncidentType,
  type ReportStatus,
  type ReportSummary,
  INCIDENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  fetchAgentReports,
  getReportSummary,
  getAgentsWithReports,
} from '@/lib/agentReportsApi';

export default function AgentReports() {
  const { user, isAdmin, isHR } = useAuth();
  const canEdit = isAdmin || isHR;

  // Filter state
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [agentEmail, setAgentEmail] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [status, setStatus] = useState('open');

  // Data state
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [agents, setAgents] = useState<{ email: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsAgent, setAnalyticsAgent] = useState<{ email: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [reportsResult, summaryResult, agentsResult] = await Promise.all([
      fetchAgentReports({
        year,
        month,
        agentEmail: agentEmail || undefined,
        incidentType: incidentType as IncidentType || undefined,
        status: status as ReportStatus || undefined,
      }),
      getReportSummary(year, month),
      getAgentsWithReports(),
    ]);

    if (reportsResult.data) {
      setReports(reportsResult.data);
    }
    if (summaryResult.data) {
      setSummary(summaryResult.data);
    }
    if (agentsResult.data) {
      setAgents(agentsResult.data);
    }

    setIsLoading(false);
  }, [year, month, agentEmail, incidentType, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setAgentEmail('');
    setIncidentType('');
    setStatus('open'); // Preserve default "open" filter
  };

  const handleViewReport = (report: AgentReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const handleViewAnalytics = (agent: { email: string; name: string }) => {
    setAnalyticsAgent(agent);
    setShowAnalytics(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileWarning className="h-6 w-6 text-primary" />
              Agent Reports
            </h1>
            <p className="text-muted-foreground">
              Behavioral and compliance incident reports for investigation and validation
            </p>
          </div>
          <PageGuideButton pageId="agent-reports" />
        </div>

        {/* Summary Cards */}
        <ReportSummaryCards summary={summary} isLoading={isLoading} data-tour="summary-cards" />

        {/* EOD Team Analytics Panel */}
        <EODAnalyticsPanel />

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent data-tour="report-filters">
            <ReportFilters
              year={year}
              month={month}
              agentEmail={agentEmail}
              incidentType={incidentType}
              status={status}
              agents={agents}
              onYearChange={setYear}
              onMonthChange={setMonth}
              onAgentChange={setAgentEmail}
              onIncidentTypeChange={setIncidentType}
              onStatusChange={setStatus}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Agent Analytics (if selected) */}
        {showAnalytics && analyticsAgent && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => {
                setShowAnalytics(false);
                setAnalyticsAgent(null);
              }}
            >
              Close
            </Button>
            <AgentAnalyticsPanel 
              agentEmail={analyticsAgent.email} 
              agentName={analyticsAgent.name} 
            />
          </div>
        )}

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Incident Reports
              {reports.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {reports.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Click on a report to view details and update status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No incident reports found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Incident Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => {
                      const typeConfig = INCIDENT_TYPE_CONFIG[report.incident_type];
                      const severityConfig = SEVERITY_CONFIG[report.severity];
                      const statusConfig = STATUS_CONFIG[report.status];

                      return (
                        <TableRow 
                          key={report.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewReport(report)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{report.agent_name}</p>
                              <p className="text-xs text-muted-foreground">{report.agent_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={typeConfig.color}>{typeConfig.label}</span>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(report.incident_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge className={severityConfig.color}>
                              {severityConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.frequency_count > 1 ? (
                              <span className="text-amber-600 font-medium">
                                {report.frequency_count}x this week
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAnalytics({ 
                                    email: report.agent_email, 
                                    name: report.agent_name 
                                  });
                                }}
                                title="View Analytics"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Detail Dialog */}
        <ReportDetailDialog
          report={selectedReport}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onStatusUpdated={loadData}
          currentUserEmail={user?.email || ''}
          canEdit={canEdit}
        />
      </div>
    </Layout>
  );
}
