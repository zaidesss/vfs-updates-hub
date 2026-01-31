import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { QAActionPlan } from '@/lib/qaEvaluationsApi';

interface QAActionPlanSelectProps {
  actionPlans: QAActionPlan[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function QAActionPlanSelect({
  actionPlans,
  selectedIds,
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

  return (
    <div className="space-y-4">
      {Object.entries(groupedPlans).map(([category, plans]) => (
        <div key={category} className="space-y-2">
          <Badge variant="secondary" className="mb-2">{category}</Badge>
          <div className="grid gap-2">
            {plans.map(plan => (
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
      ))}
    </div>
  );
}
