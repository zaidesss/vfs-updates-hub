import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Sparkles, Check, ChevronDown, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface QAScoreRowProps {
  subcategory: string;
  behavior: string;
  maxPoints: number;
  score: number | null;
  aiSuggested: number | null;
  aiAccepted: boolean | null;
  aiJustification?: string | null;
  onScoreChange: (score: number) => void;
  onAcceptAI: () => void;
  occurrenceCount?: number;
  occurrenceReferences?: string[]; // QA-XXXX references from previous occurrences
}

export function QAScoreRow({
  subcategory,
  behavior,
  maxPoints,
  score,
  aiSuggested,
  aiAccepted,
  aiJustification,
  onScoreChange,
  onAcceptAI,
  occurrenceCount,
  occurrenceReferences = [],
}: QAScoreRowProps) {
  const [justificationOpen, setJustificationOpen] = useState(false);
  
  // All-or-nothing scoring: only 0 or maxPoints allowed
  const scoreOptions = [0, maxPoints];
  
  // Show justification only for failed AI suggestions
  const showJustification = aiJustification && aiSuggested === 0;

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="font-medium">{subcategory}</Label>
            {occurrenceCount && occurrenceCount > 1 && (
              <Badge 
                variant="outline" 
                className="text-xs bg-amber-100 text-amber-800 border-amber-300"
                title={occurrenceReferences.length > 0 ? `Previous: ${occurrenceReferences.join(', ')}` : undefined}
              >
                {occurrenceCount === 2 ? '2nd' : occurrenceCount === 3 ? '3rd' : `${occurrenceCount}th`} occurrence
                {occurrenceReferences.length > 0 && (
                  <span className="ml-1 text-amber-600">
                    ({occurrenceReferences.slice(0, 3).join(', ')}{occurrenceReferences.length > 3 ? '...' : ''})
                  </span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{behavior}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {aiSuggested !== null && !aiAccepted && (
            <Button
              variant={aiSuggested === 0 ? "destructive" : "outline"}
              size="sm"
              onClick={onAcceptAI}
              className={aiSuggested === 0 ? "" : "text-primary"}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI: {aiSuggested === 0 ? 'Fail' : aiSuggested}
            </Button>
          )}
          
          {aiAccepted && (
            <Badge variant="secondary" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              AI accepted
            </Badge>
          )}

          <Select 
            value={score !== null ? score.toString() : ''} 
            onValueChange={(v) => onScoreChange(parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {scoreOptions.map(opt => (
                <SelectItem key={opt} value={opt.toString()}>
                  {opt} {opt === 0 ? '(Fail)' : '(Pass)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">/ {maxPoints}</span>
        </div>
      </div>
      
      {/* AI Justification for failures */}
      {showJustification && (
        <Collapsible open={justificationOpen} onOpenChange={setJustificationOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 cursor-pointer">
            <AlertCircle className="h-4 w-4" />
            <span>AI Justification</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${justificationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
            {aiJustification}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
