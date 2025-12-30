import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { UserAcknowledgementDashboard } from '@/components/UserAcknowledgementDashboard';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';

export default function Dashboard() {
  const { isAdmin, agents } = useAuth();
  const { updates, acknowledgements, isLoading } = useUpdates();

  useEffect(() => {
    document.title = 'Dashboard | VFS Updates Hub';
  }, []);

  if (!isAdmin) {
    return (
      <Layout>
        <section className="text-center py-12">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Team acknowledgement overview</p>
      </header>

      <main className="space-y-6">
        <UserAcknowledgementDashboard agents={agents} updates={updates} acknowledgements={acknowledgements} />

        {isLoading ? (
          <section className="text-muted-foreground">Loading…</section>
        ) : null}
      </main>
    </Layout>
  );
}
