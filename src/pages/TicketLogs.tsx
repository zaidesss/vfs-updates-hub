import { Layout } from '@/components/Layout';
import { TicketDashboard } from '@/components/ticket-logs/TicketDashboard';
import { TicketSearch } from '@/components/ticket-logs/TicketSearch';
import { PageHeader } from '@/components/ui/page-header';
import { PageGuideButton } from '@/components/PageGuideButton';

export default function TicketLogs() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Ticket Logs"
          description="View ticket counts per agent from Zendesk data"
        >
          <PageGuideButton pageId="ticket-logs" />
        </PageHeader>


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
