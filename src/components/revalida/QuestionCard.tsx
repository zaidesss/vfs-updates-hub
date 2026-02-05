import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestionDraft {
  id?: string;
  type: 'mcq' | 'true_false' | 'situational';
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string | null;
  points: number;
  order_index: number;
}

interface QuestionCardProps {
  question: QuestionDraft;
  index: number;
  totalQuestions: number;
  onChange: (updated: QuestionDraft) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionCardProps) {
  const handleChange = <K extends keyof QuestionDraft>(field: K, value: QuestionDraft[K]) => {
    const updated = { ...question, [field]: value };
    
    // Reset correct_answer when type changes
    if (field === 'type') {
      if (value === 'situational') {
        updated.correct_answer = null;
      } else if (value === 'true_false') {
        updated.correct_answer = 'True';
        updated.choice_a = '';
        updated.choice_b = '';
        updated.choice_c = '';
        updated.choice_d = '';
      } else if (value === 'mcq') {
        updated.correct_answer = 'A';
      }
      // Set default points based on type
      if (value === 'mcq') updated.points = 5;
      else if (value === 'true_false') updated.points = 2;
      else if (value === 'situational') updated.points = 10;
    }
    
    onChange(updated);
  };

  return (
    <Card className="border-border">
      <CardContent className="pt-4 space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Question {index + 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveUp}
              disabled={index === 0}
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoveDown}
              disabled={index === totalQuestions - 1}
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Type and Points Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={question.type}
              onValueChange={(value) => handleChange('type', value as QuestionDraft['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="situational">Situational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Points</Label>
            <Input
              type="number"
              min={1}
              value={question.points}
              onChange={(e) => handleChange('points', Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>

        {/* Question Prompt */}
        <div className="space-y-2">
          <Label>Question</Label>
          <Textarea
            value={question.prompt}
            onChange={(e) => handleChange('prompt', e.target.value)}
            placeholder="Enter your question..."
            rows={question.type === 'situational' ? 4 : 2}
          />
        </div>

        {/* MCQ Choices */}
        {question.type === 'mcq' && (
          <div className="space-y-3">
            <Label>Choices</Label>
            <div className="space-y-2">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const fieldKey = `choice_${letter.toLowerCase()}` as keyof QuestionDraft;
                const isRequired = letter === 'A' || letter === 'B';
                return (
                  <div key={letter} className="flex items-center gap-2">
                    <span className={cn(
                      "w-6 text-sm font-medium",
                      isRequired ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {letter}:
                    </span>
                    <Input
                      value={question[fieldKey] as string}
                      onChange={(e) => handleChange(fieldKey, e.target.value)}
                      placeholder={isRequired ? `Choice ${letter} (required)` : `Choice ${letter} (optional)`}
                      className="flex-1"
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Correct Answer Selection */}
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <RadioGroup
                value={question.correct_answer || 'A'}
                onValueChange={(value) => handleChange('correct_answer', value)}
                className="flex gap-4"
              >
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const fieldKey = `choice_${letter.toLowerCase()}` as keyof QuestionDraft;
                  const hasValue = !!(question[fieldKey] as string);
                  const isDisabled = (letter === 'C' || letter === 'D') && !hasValue;
                  return (
                    <div key={letter} className="flex items-center gap-1.5">
                      <RadioGroupItem 
                        value={letter} 
                        id={`answer-${index}-${letter}`}
                        disabled={isDisabled}
                      />
                      <Label 
                        htmlFor={`answer-${index}-${letter}`}
                        className={cn(
                          "cursor-pointer",
                          isDisabled && "text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        {letter}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* True/False Answer */}
        {question.type === 'true_false' && (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <RadioGroup
              value={question.correct_answer || 'True'}
              onValueChange={(value) => handleChange('correct_answer', value)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="True" id={`tf-${index}-true`} />
                <Label htmlFor={`tf-${index}-true`} className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="False" id={`tf-${index}-false`} />
                <Label htmlFor={`tf-${index}-false`} className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Situational Note */}
        {question.type === 'situational' && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm text-warning">
              Requires manual grading
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
