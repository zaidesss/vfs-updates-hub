import { StepsContent } from '@/lib/playbookTypes';

interface StepsSectionProps {
  steps: StepsContent;
}

export function StepsSection({ steps }: StepsSectionProps) {
  return (
    <div className="space-y-4">
      {steps.steps.map((step, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
            {step.number}
          </div>
          <div className="flex-1 pt-1">
            <h4 className="font-semibold text-foreground">{step.title}</h4>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
            {step.substeps && step.substeps.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {step.substeps.map((substep, subIdx) => (
                  <li key={subIdx} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{substep}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
