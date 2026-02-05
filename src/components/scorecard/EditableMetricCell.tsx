import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EditableMetricCellProps {
  value: number | null;
  originalValue: number | null;
  goal: number;
  isEditable: boolean;
  onEdit: (value: number | null) => void;
  formatValue: (value: number | null) => string;
  className?: string;
}

// Parse input - accepts raw seconds
function parseInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Remove 's' suffix if present and parse as integer seconds
  const cleanValue = trimmed.replace(/s$/i, '').trim();
  const seconds = parseInt(cleanValue, 10);
  return isNaN(seconds) ? null : seconds;
}

// Calculate percentage: (goal / actual) * 100 for AHT/FRT (lower is better)
function calculatePercentage(value: number | null, goal: number): number | null {
  if (value === null || value === 0 || goal === 0) return null;
  return Math.min(100, (goal / value) * 100);
}

// Get color class based on percentage
function getPercentageColor(percentage: number | null): string {
  if (percentage === null) return 'text-muted-foreground';
  if (percentage >= 100) return 'text-green-600 dark:text-green-400';
  if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
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
}: EditableMetricCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const displayValue = value;
  const percentage = calculatePercentage(displayValue, goal);
  const isEdited = originalValue !== null && value !== null && value !== originalValue;
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleClick = () => {
    if (isEditable) {
      // Show raw seconds value for editing (without 's' suffix)
      setInputValue(displayValue !== null ? String(displayValue) : '');
      setIsEditing(true);
    }
  };
  
  const handleBlur = () => {
    const parsed = parseInput(inputValue);
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
        className={cn("px-2 py-1 rounded bg-muted/30", className)}
        onClick={handleClick}
      >
        <span className="text-muted-foreground">Pending</span>
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
          placeholder="seconds"
        />
      ) : (
        <span className="text-foreground font-medium">
          {formatValue(displayValue)}
        </span>
      )}
      
      {percentage !== null && (
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
