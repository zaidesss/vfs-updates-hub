import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { RevalidaV2Batch, createBatch, generateQuestions } from '@/lib/revalidaV2Api';
import { toast } from 'sonner';

interface BatchConfigFormProps {
  onBatchCreated: (batch: RevalidaV2Batch) => void;
}

export const BatchConfigForm = ({ onBatchCreated }: BatchConfigFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startAt: new Date().toISOString().split('T')[0],
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mcqCount: 5,
    tfCount: 3,
    situationalCount: 2,
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newBatch = await createBatch({
        title: formData.title,
        is_active: false,
        start_at: new Date(formData.startAt).toISOString(),
        end_at: new Date(formData.endAt).toISOString(),
        mcq_count: parseInt(formData.mcqCount.toString()),
        tf_count: parseInt(formData.tfCount.toString()),
        situational_count: parseInt(formData.situationalCount.toString()),
        generation_status: 'pending' as const,
        created_by: 'current_user',
      });

      // Start question generation
      await generateQuestions(newBatch.id);
      
      onBatchCreated(newBatch);
      toast.success('Batch created and question generation started!');
      
      // Reset form
      setFormData({
        title: '',
        startAt: new Date().toISOString().split('T')[0],
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mcqCount: 5,
        tfCount: 3,
        situationalCount: 2,
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create batch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Assessment Batch</CardTitle>
        <CardDescription>Configure and generate a new Revalida 2.0 batch with AI-powered questions</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Batch Title</Label>
            <Input
              id="title"
              placeholder="e.g., Week 42 - Q4 Assessment"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start Date</Label>
              <Input
                id="startAt"
                type="date"
                value={formData.startAt}
                onChange={(e) => handleChange('startAt', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">End Date</Label>
              <Input
                id="endAt"
                type="date"
                value={formData.endAt}
                onChange={(e) => handleChange('endAt', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <p className="font-medium text-sm">Question Breakdown</p>
            
            <div className="space-y-2">
              <Label htmlFor="mcqCount">Multiple Choice Questions (1 point each)</Label>
              <Input
                id="mcqCount"
                type="number"
                min="0"
                max="20"
                value={formData.mcqCount}
                onChange={(e) => handleChange('mcqCount', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tfCount">True/False Questions (1 point each)</Label>
              <Input
                id="tfCount"
                type="number"
                min="0"
                max="20"
                value={formData.tfCount}
                onChange={(e) => handleChange('tfCount', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="situationalCount">Situational Questions (5 points each)</Label>
              <Input
                id="situationalCount"
                type="number"
                min="0"
                max="10"
                value={formData.situationalCount}
                onChange={(e) => handleChange('situationalCount', parseInt(e.target.value))}
              />
            </div>

            <div className="pt-2 border-t space-y-1">
              <p className="text-sm">
                <strong>Total Points:</strong> {formData.mcqCount + formData.tfCount + (formData.situationalCount * 5)}
              </p>
              <p className="text-xs text-muted-foreground">
                Questions will be auto-generated from recent Knowledge Base articles, QA evaluations, and contracts
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Creating Batch & Generating Questions...
              </>
            ) : (
              'Create Batch & Generate Questions'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
