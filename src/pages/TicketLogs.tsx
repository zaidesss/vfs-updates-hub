import { Layout } from '@/components/Layout';
import { TicketDashboard } from '@/components/ticket-logs/TicketDashboard';
import { TicketSearch } from '@/components/ticket-logs/TicketSearch';
import { PageGuideButton } from '@/components/PageGuideButton';

export default function TicketLogs() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ticket Logs</h1>
            <p className="text-muted-foreground">
              View ticket counts per agent from Zendesk data
            </p>
          </div>
          <PageGuideButton pageId="ticket-logs" />
        </div>


        <div data-tour="instance-selector">
          <TicketDashboard 
            zdInstance="customerserviceadvocates" 
            title="ZD1 - Customer Service Advocates"
          />
        </div>
        
        <TicketDashboard 
          zdInstance="customerserviceadvocateshelp" 
          title="ZD2 - Customer Service Advocates Help"
        />
        
        <TicketSearch />
      </div>
    </Layout>
  );
}
