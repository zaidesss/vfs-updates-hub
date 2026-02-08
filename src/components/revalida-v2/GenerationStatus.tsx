import { useState } from 'react';
import { RevalidaV2Batch } from '@/lib/revalidaV2Api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';

interface GenerationStatusProps {
  batch: RevalidaV2Batch;
}

export const GenerationStatus = ({ batch }: GenerationStatusProps) => {
  const getStatusIcon = () => {
    switch (batch.generation_status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case 'generating':
        return <Zap className="h-5 w-5 text-primary animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (batch.generation_status) {
      case 'pending':
        return 'bg-muted border-border';
      case 'generating':
        return 'bg-primary/10 border-primary';
      case 'completed':
        return 'bg-primary/10 border-primary';
      case 'failed':
        return 'bg-destructive/10 border-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <Card className={`border ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-base">Generation Status</CardTitle>
              <CardDescription>AI is working on your questions</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            {batch.generation_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {batch.generation_status === 'generating' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Fetching knowledge base articles...
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              Analyzing QA evaluations...
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              Generating questions with AI...
            </div>
          </div>
        )}

        {batch.generation_status === 'completed' && (
          <div className="space-y-2">
            <p className="text-sm text-primary">
              ✓ Questions generated successfully
            </p>
            <p className="text-xs text-muted-foreground">
              Total points: {batch.total_points}
            </p>
            {batch.source_week_start && (
              <p className="text-xs text-muted-foreground">
                Source week: {new Date(batch.source_week_start).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {batch.generation_status === 'failed' && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">
              ✗ Generation failed
            </p>
            {batch.generation_error && (
              <p className="text-xs text-muted-foreground">
                Error: {batch.generation_error}
              </p>
            )}
          </div>
        )}

        {batch.generation_status === 'pending' && (
          <p className="text-sm text-muted-foreground">
            Waiting to start generation...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
