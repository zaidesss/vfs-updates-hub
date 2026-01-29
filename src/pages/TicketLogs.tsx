import { Layout } from '@/components/Layout';
import { TicketDashboard } from '@/components/ticket-logs/TicketDashboard';
import { TicketSearch } from '@/components/ticket-logs/TicketSearch';

export default function TicketLogs() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Logs</h1>
          <p className="text-muted-foreground">
            View ticket counts per agent from Zendesk data
          </p>
        </div>

        <TicketDashboard />
        <TicketSearch />
      </div>
    </Layout>
  );
}
