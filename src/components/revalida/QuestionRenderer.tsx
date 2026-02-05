import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RevalidaQuestion } from '@/lib/revalidaApi';

interface QuestionRendererProps {
  question: RevalidaQuestion;
  questionNumber: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  questionNumber,
  value,
  onChange,
  disabled = false,
}: QuestionRendererProps) {
  const getTypeBadge = () => {
    switch (question.type) {
      case 'mcq':
        return <Badge variant="outline" className="text-xs">Multiple Choice</Badge>;
      case 'true_false':
        return <Badge variant="outline" className="text-xs">True/False</Badge>;
      case 'situational':
        return <Badge variant="outline" className="text-xs">Situational</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Question {questionNumber}
            </span>
            {getTypeBadge()}
            <span className="text-xs text-muted-foreground">
              ({question.points} {question.points === 1 ? 'point' : 'points'})
            </span>
          </div>
          <p className="text-base font-medium">{question.prompt}</p>
        </div>
      </div>

      {/* MCQ Choices */}
      {question.type === 'mcq' && (
        <RadioGroup
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="space-y-2"
        >
          {question.choice_a && (
            <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="A" id={`${question.id}-a`} />
              <Label htmlFor={`${question.id}-a`} className="flex-1 cursor-pointer">
                <span className="font-medium mr-2">A.</span>
                {question.choice_a}
              </Label>
            </div>
          )}
          {question.choice_b && (
            <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="B" id={`${question.id}-b`} />
              <Label htmlFor={`${question.id}-b`} className="flex-1 cursor-pointer">
                <span className="font-medium mr-2">B.</span>
                {question.choice_b}
              </Label>
            </div>
          )}
          {question.choice_c && (
            <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="C" id={`${question.id}-c`} />
              <Label htmlFor={`${question.id}-c`} className="flex-1 cursor-pointer">
                <span className="font-medium mr-2">C.</span>
                {question.choice_c}
              </Label>
            </div>
          )}
          {question.choice_d && (
            <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="D" id={`${question.id}-d`} />
              <Label htmlFor={`${question.id}-d`} className="flex-1 cursor-pointer">
                <span className="font-medium mr-2">D.</span>
                {question.choice_d}
              </Label>
            </div>
          )}
        </RadioGroup>
      )}

      {/* True/False */}
      {question.type === 'true_false' && (
        <RadioGroup
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="True" id={`${question.id}-true`} />
            <Label htmlFor={`${question.id}-true`} className="flex-1 cursor-pointer">
              True
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="False" id={`${question.id}-false`} />
            <Label htmlFor={`${question.id}-false`} className="flex-1 cursor-pointer">
              False
            </Label>
          </div>
        </RadioGroup>
      )}

      {/* Situational (free text) */}
      {question.type === 'situational' && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer here..."
          rows={4}
          className="resize-none"
        />
      )}
    </div>
  );
}
