import { Layout } from '@/components/Layout';
import { BarChart3 } from 'lucide-react';

const VolumeDemand = () => (
  <Layout>
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <BarChart3 className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold">Volume & Demand</h1>
      <p className="text-muted-foreground">Coming Soon</p>
    </div>
  </Layout>
);

export default VolumeDemand;
