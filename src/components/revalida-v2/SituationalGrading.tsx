import { useState } from 'react';
import { RevalidaV2Answer, RevalidaV2Question, updateAnswer, gradeSituational } from '@/lib/revalidaV2Api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface SituationalGradingProps {
  answers: RevalidaV2Answer[];
  questions: Record<string, RevalidaV2Question>;
}

export const SituationalGrading = ({ answers, questions }: SituationalGradingProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideScores, setOverrideScores] = useState<Record<string, number>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const situationalAnswers = answers.filter(
    a => questions[a.question_id]?.type === 'situational'
  );

  const handleGradeAnswer = async (answer: RevalidaV2Answer) => {
    setIsProcessing(true);
    try {
      const result = await gradeSituational(
        answer.id,
        answer.question_id,
        answer.agent_answer || ''
      );

      toast.success('Answer graded with AI suggestion');
    } catch (error) {
      toast.error('Failed to grade answer');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveOverride = async (answerId: string) => {
    const score = overrideScores[answerId];
    const reason = overrideReasons[answerId];

    if (!reason) {
      toast.error('Please provide a reason for the override');
      return;
    }

    try {
      await updateAnswer(answerId, {
        admin_override_score: score,
        admin_override_reason: reason,
        ai_status: 'override',
      });

      setEditingId(null);
      setOverrideScores(prev => {
        const newScores = { ...prev };
        delete newScores[answerId];
        return newScores;
      });
      setOverrideReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[answerId];
        return newReasons;
      });

      toast.success('Score override saved');
    } catch (error) {
      toast.error('Failed to save override');
    }
  };

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList>
        <TabsTrigger value="pending">
          Pending Grading ({situationalAnswers.filter(a => a.ai_status === 'pending').length})
        </TabsTrigger>
        <TabsTrigger value="graded">
          AI Graded ({situationalAnswers.filter(a => a.ai_status === 'graded').length})
        </TabsTrigger>
        <TabsTrigger value="override">
          Overrides ({situationalAnswers.filter(a => a.ai_status === 'override').length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        {situationalAnswers.filter(a => a.ai_status === 'pending').map(answer => (
          <Card key={answer.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {questions[answer.question_id]?.prompt}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {answer.agent_answer}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleGradeAnswer(answer)}
                disabled={isProcessing}
              >
                Grade with AI
              </Button>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="graded" className="space-y-4">
        {situationalAnswers.filter(a => a.ai_status === 'graded').map(answer => (
          <Card key={answer.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {questions[answer.question_id]?.prompt}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {answer.agent_answer}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {answer.ai_suggested_score}/5
                  </div>
                  <Badge variant="outline" className="mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    AI Graded
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted rounded text-sm">
                <p className="font-medium mb-1">AI Justification:</p>
                <p>{answer.ai_score_justification}</p>
              </div>

              {editingId !== answer.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(answer.id);
                    setOverrideScores(prev => ({
                      ...prev,
                      [answer.id]: answer.ai_suggested_score || 0,
                    }));
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Override Score
                </Button>
              )}

              {editingId === answer.id && (
                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor={`score-${answer.id}`}>New Score (0-5)</Label>
                    <Input
                      id={`score-${answer.id}`}
                      type="number"
                      min="0"
                      max="5"
                      value={overrideScores[answer.id] || 0}
                      onChange={(e) =>
                        setOverrideScores(prev => ({
                          ...prev,
                          [answer.id]: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`reason-${answer.id}`}>Reason for Override</Label>
                    <Textarea
                      id={`reason-${answer.id}`}
                      placeholder="Why are you adjusting the AI score?"
                      value={overrideReasons[answer.id] || ''}
                      onChange={(e) =>
                        setOverrideReasons(prev => ({
                          ...prev,
                          [answer.id]: e.target.value,
                        }))
                      }
                      className="h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveOverride(answer.id)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save Override
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="override" className="space-y-4">
        {situationalAnswers.filter(a => a.ai_status === 'override').map(answer => (
          <Card key={answer.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {questions[answer.question_id]?.prompt}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {answer.agent_answer}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {answer.admin_override_score}/5
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <s>{answer.ai_suggested_score}/5</s>
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">AI Suggestion:</p>
                <p className="text-sm text-muted-foreground">{answer.ai_score_justification}</p>
              </div>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">Override Reason:</p>
                <p className="text-sm text-muted-foreground">{answer.admin_override_reason}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
};
