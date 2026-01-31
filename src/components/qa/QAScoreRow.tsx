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
}

const SCORE_OPTIONS = [2, 3, 4, 5, 6];

export function QAScoreRow({
  subcategory,
  behavior,
  maxPoints,
  score,
  aiSuggested,
  aiAccepted,
  onScoreChange,
  onAcceptAI,
}: QAScoreRowProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg">
      <div className="flex-1">
        <Label className="font-medium">{subcategory}</Label>
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
          <SelectTrigger className="w-20">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {SCORE_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt.toString()}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">/ {maxPoints}</span>
      </div>
    </div>
  );
}
