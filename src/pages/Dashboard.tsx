import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { UserAcknowledgementDashboard } from '@/components/UserAcknowledgementDashboard';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { updates, acknowledgements, isLoading, ensureLoaded } = useUpdates();

  useEffect(() => {
    ensureLoaded();
    document.title = 'Dashboard | VFS Updates Hub';
  }, [ensureLoaded]);

  if (!isAdmin) {
    return (
      <Layout>
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="Access Denied"
          description="You don't have permission to view this page."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Dashboard"
        description="Team acknowledgement overview"
      />

      <main className="space-y-6">
        <UserAcknowledgementDashboard updates={updates} acknowledgements={acknowledgements} />

        {isLoading ? (
          <section className="text-muted-foreground">Loading…</section>
        ) : null}
      </main>
    </Layout>
  );
}
