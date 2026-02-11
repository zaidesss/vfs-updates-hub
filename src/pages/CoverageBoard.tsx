import { Layout } from '@/components/Layout';

export default function CoverageBoard() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Coverage Board</h1>
          <p className="text-muted-foreground">Weekly team coverage timeline view</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Coverage timeline will be built here in upcoming steps.
        </div>
      </div>
    </Layout>
  );
}
