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
import { Sparkles, Check } from 'lucide-react';

interface QAScoreRowProps {
  subcategory: string;
  behavior: string;
  maxPoints: number;
  score: number | null;
  aiSuggested: number | null;
  aiAccepted: boolean | null;
  onScoreChange: (score: number) => void;
  onAcceptAI: () => void;
  occurrenceCount?: number;
}

export function QAScoreRow({
  subcategory,
  behavior,
  maxPoints,
  score,
  aiSuggested,
  aiAccepted,
  onScoreChange,
  onAcceptAI,
  occurrenceCount,
}: QAScoreRowProps) {
  // All-or-nothing scoring: only 0 or maxPoints allowed
  const scoreOptions = [0, maxPoints];

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Label className="font-medium">{subcategory}</Label>
          {occurrenceCount && occurrenceCount > 1 && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
              {occurrenceCount === 2 ? '2nd' : occurrenceCount === 3 ? '3rd' : `${occurrenceCount}th`} occurrence
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{behavior}</p>
      </div>
      
      <div className="flex items-center gap-2">
        {aiSuggested !== null && !aiAccepted && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAcceptAI}
            className="text-primary"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI: {aiSuggested}
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
  );
}
