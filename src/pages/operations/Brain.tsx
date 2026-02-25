import { Layout } from '@/components/Layout';
import { Brain as BrainIcon } from 'lucide-react';

const Brain = () => (
  <Layout>
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <BrainIcon className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold">Brain</h1>
      <p className="text-muted-foreground">Coming Soon</p>
    </div>
  </Layout>
);

export default Brain;
