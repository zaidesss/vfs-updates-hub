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
import { Sparkles, AlertTriangle, ChevronDown, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface QACriticalRowProps {
  subcategory: string;
  behavior: string;
  hasCritical: boolean | null;
  aiSuggested: boolean | null;
  aiJustification?: string | null;
  onCriticalChange: (hasCritical: boolean) => void;
  onAcceptAI: (accept: boolean) => void;
  occurrenceCount?: number;
}

export function QACriticalRow({
  subcategory,
  behavior,
  hasCritical,
  aiSuggested,
  aiJustification,
  onCriticalChange,
  onAcceptAI,
  occurrenceCount,
}: QACriticalRowProps) {
  const [justificationOpen, setJustificationOpen] = useState(false);
  
  // Show justification only for critical error detections
  const showJustification = aiJustification && aiSuggested === true;

  return (
    <div className={`flex flex-col gap-2 p-4 border rounded-lg ${hasCritical === true ? 'border-destructive bg-destructive/5' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <Label className="font-medium text-destructive">{subcategory}</Label>
            <Badge variant="destructive" className="text-xs">Critical Error</Badge>
            {occurrenceCount && occurrenceCount > 1 && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                {occurrenceCount === 2 ? '2nd' : occurrenceCount === 3 ? '3rd' : `${occurrenceCount}th`} occurrence
              </Badge>
            )}
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
      
      {/* AI Justification for critical errors */}
      {showJustification && (
        <Collapsible open={justificationOpen} onOpenChange={setJustificationOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 cursor-pointer">
            <AlertCircle className="h-4 w-4" />
            <span>AI Justification</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${justificationOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {aiJustification}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
