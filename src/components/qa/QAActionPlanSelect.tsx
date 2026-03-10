import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import type { QAActionPlan } from '@/lib/qaEvaluationsApi';

interface QAActionPlanSelectProps {
  actionPlans: QAActionPlan[];
  selectedIds: string[];
  suggestedIds?: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function QAActionPlanSelect({
  actionPlans,
  selectedIds,
  suggestedIds = [],
  onSelectionChange,
}: QAActionPlanSelectProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Group by category
  const groupedPlans = actionPlans.reduce((acc, plan) => {
    const cat = plan.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(plan);
    return acc;
  }, {} as Record<string, QAActionPlan[]>);

  // Separate suggested and non-suggested plans
  const suggestedPlans = actionPlans.filter(p => suggestedIds.includes(p.id));
  const otherPlans = actionPlans.filter(p => !suggestedIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* AI Suggested Actions - shown at top with highlight */}
      {suggestedPlans.length > 0 && (
        <div className="space-y-2 p-3 bg-primary/5 border-2 border-primary/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary text-sm">AI Suggested Actions</span>
          </div>
          <div className="grid gap-2">
            {suggestedPlans.map(plan => (
              <div 
                key={plan.id} 
                className="flex items-start gap-2 p-2 border border-primary/30 rounded-md bg-card hover:bg-primary/5 cursor-pointer"
                onClick={() => handleToggle(plan.id)}
              >
                <Checkbox
                  id={`suggested-${plan.id}`}
                  checked={selectedIds.includes(plan.id)}
                  onCheckedChange={() => handleToggle(plan.id)}
                  className="mt-0.5"
                />
                <Label 
                  htmlFor={`suggested-${plan.id}`} 
                  className="text-sm cursor-pointer flex-1"
                >
                  {plan.action_text}
                  <Badge variant="outline" className="ml-2 text-xs">{plan.category}</Badge>
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular action plans grouped by category */}
      {Object.entries(groupedPlans).map(([category, plans]) => {
        // Filter out already-shown suggested plans
        const remainingPlans = plans.filter(p => !suggestedIds.includes(p.id));
        if (remainingPlans.length === 0) return null;
        
        return (
          <div key={category} className="space-y-2">
            <Badge variant="secondary" className="mb-2">{category}</Badge>
            <div className="grid gap-2">
              {remainingPlans.map(plan => (
                <div 
                  key={plan.id} 
                  className="flex items-start gap-2 p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggle(plan.id)}
                >
                  <Checkbox
                    id={plan.id}
                    checked={selectedIds.includes(plan.id)}
                    onCheckedChange={() => handleToggle(plan.id)}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor={plan.id} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {plan.action_text}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
