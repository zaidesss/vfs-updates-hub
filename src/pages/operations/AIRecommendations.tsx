import { Layout } from '@/components/Layout';
import { Sparkles } from 'lucide-react';

const AIRecommendations = () => (
  <Layout>
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <Sparkles className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold">AI Recommendations</h1>
      <p className="text-muted-foreground">Coming Soon</p>
    </div>
  </Layout>
);

export default AIRecommendations;
