import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableMetricCellProps {
  value: number | null;
  originalValue: number | null;
  goal: number;
  isEditable: boolean;
  onEdit: (value: number | null) => void;
  formatValue: (value: number | null) => string;
  className?: string;
  isPercentMode?: boolean; // When true, uses higher-is-better calculation
}

// Parse time input - accepts mm:ss format or plain seconds
function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  // Remove 's' suffix if present (e.g., "420s" -> "420")
  const cleanedInput = trimmed.replace(/s$/i, '').replace(/%$/i, '');
  
  // Check for mm:ss format
  if (cleanedInput.includes(':')) {
    const parts = cleanedInput.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  
  // Otherwise treat as number (seconds or percentage)
  const num = parseFloat(cleanedInput);
  return isNaN(num) ? null : num;
}

// Calculate percentage: (goal / actual) * 100 for AHT/FRT (lower is better)
// Or (actual / goal) * 100 for percent mode (higher is better)
function calculatePercentage(value: number | null, goal: number, isPercentMode: boolean = false): number | null {
  if (value === null || goal === 0) return null;
  if (isPercentMode) {
    // For percentage mode (e.g., Order Escalation), value IS the percentage
    // Calculate vs goal: (actual / goal) * 100
    return Math.min(100, (value / goal) * 100);
  }
  // For AHT/FRT: lower is better
  if (value === 0) return null;
  return Math.min(100, (goal / value) * 100);
}

// Get color class based on percentage
function getPercentageColor(percentage: number | null): string {
  if (percentage === null) return 'text-muted-foreground';
  if (percentage >= 100) return 'text-green-600 dark:text-green-400';
  if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

// Get color based on percentage for percent mode (higher is better)
function getPercentModeColor(value: number | null, goal: number): string {
  if (value === null) return 'text-muted-foreground';
  const pct = (value / goal) * 100;
  if (pct >= 100) return 'text-green-600 dark:text-green-400';
  if (pct >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function EditableMetricCell({
  value,
  originalValue,
  goal,
  isEditable,
  onEdit,
  formatValue,
  className,
  isPercentMode = false,
}: EditableMetricCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const displayValue = value;
  const percentage = calculatePercentage(displayValue, goal, isPercentMode);
  const isEdited = originalValue !== null && value !== null && value !== originalValue;
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleClick = () => {
    if (isEditable) {
      setInputValue(displayValue !== null ? formatValue(displayValue) : '');
      setIsEditing(true);
    }
  };
  
  const handleBlur = () => {
    const parsed = parseTimeInput(inputValue);
    onEdit(parsed);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };
  
  if (displayValue === null && !isEditing) {
    return (
      <div 
        className={cn(
          "px-2 py-1 rounded bg-muted/30",
          isEditable && "cursor-pointer hover:bg-accent/50 transition-colors",
          className
        )}
        onClick={handleClick}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs">N/A</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Data unavailable{isEditable ? ' - click to enter manually' : ''}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "px-2 py-1 rounded flex flex-col items-center gap-0.5",
        isEditable && !isEditing && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={!isEditing ? handleClick : undefined}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-6 w-16 text-center text-sm px-1"
          placeholder={isPercentMode ? "e.g. 95" : "seconds"}
        />
      ) : (
        <span className={cn("font-medium", isPercentMode ? getPercentModeColor(displayValue, goal) : "text-foreground")}>
          {formatValue(displayValue)}
        </span>
      )}
      
      {/* Only show percentage for non-percent mode (AHT/FRT) */}
      {!isPercentMode && percentage !== null && (
        <span className={cn("text-xs", getPercentageColor(percentage))}>
          {percentage.toFixed(1)}%
        </span>
      )}
      
      {isEdited && !isEditing && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 border-amber-300">
          edited
        </Badge>
      )}
    </div>
  );
}
