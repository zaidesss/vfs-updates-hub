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
import { Sparkles, AlertTriangle } from 'lucide-react';

interface QACriticalRowProps {
  subcategory: string;
  behavior: string;
  hasCritical: boolean | null;
  aiSuggested: boolean | null;
  onCriticalChange: (hasCritical: boolean) => void;
  onAcceptAI: (accept: boolean) => void;
}

export function QACriticalRow({
  subcategory,
  behavior,
  hasCritical,
  aiSuggested,
  onCriticalChange,
  onAcceptAI,
}: QACriticalRowProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 p-4 border rounded-lg ${hasCritical === true ? 'border-destructive bg-destructive/5' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <Label className="font-medium text-destructive">{subcategory}</Label>
        </div>
        <p className="text-sm text-muted-foreground">{behavior}</p>
      </div>
      
      <div className="flex items-center gap-2">
        {aiSuggested !== null && (
          <div className="flex gap-1">
            <Button
              variant={aiSuggested ? "destructive" : "outline"}
              size="sm"
              onClick={() => onAcceptAI(true)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI: {aiSuggested ? 'Yes' : 'No'}
            </Button>
            {aiSuggested && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcceptAI(false)}
              >
                Decline
              </Button>
            )}
          </div>
        )}

        <Select 
          value={hasCritical === null ? '' : (hasCritical ? 'yes' : 'no')} 
          onValueChange={(v) => onCriticalChange(v === 'yes')}
        >
          <SelectTrigger className="w-24">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
          </SelectContent>
        </Select>

        {hasCritical === true && (
          <Badge variant="destructive">Critical Fail</Badge>
        )}
      </div>
    </div>
  );
}
