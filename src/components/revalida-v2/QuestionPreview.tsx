import { useState, useEffect } from 'react';
import { RevalidaV2Batch, RevalidaV2Question, getQuestionsByBatch, updateQuestion } from '@/lib/revalidaV2Api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface QuestionPreviewProps {
  batch: RevalidaV2Batch;
  onPublish?: () => void;
}

export const QuestionPreview = ({ batch, onPublish }: QuestionPreviewProps) => {
  const [questions, setQuestions] = useState<RevalidaV2Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');

  useEffect(() => {
    loadQuestions();
  }, [batch.id]);

  const loadQuestions = async () => {
    try {
      const data = await getQuestionsByBatch(batch.id);
      setQuestions(data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (question: RevalidaV2Question) => {
    setEditingId(question.id);
    setEditingPrompt(question.prompt);
  };

  const handleSaveEdit = async (questionId: string) => {
    try {
      const question = questions.find(q => q.id === questionId);
      if (!question) return;

      await updateQuestion(questionId, { prompt: editingPrompt });
      
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, prompt: editingPrompt } : q
      ));
      
      setEditingId(null);
      toast.success('Question updated');
    } catch (error) {
      toast.error('Failed to update question');
    }
  };

  const mcqQuestions = questions.filter(q => q.type === 'mcq');
  const tfQuestions = questions.filter(q => q.type === 'true_false');
  const situationalQuestions = questions.filter(q => q.type === 'situational');

  if (isLoading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{mcqQuestions.length}</p>
              <p className="text-sm text-muted-foreground">Multiple Choice</p>
              <p className="text-xs text-muted-foreground">{mcqQuestions.length} point(s)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{tfQuestions.length}</p>
              <p className="text-sm text-muted-foreground">True/False</p>
              <p className="text-xs text-muted-foreground">{tfQuestions.length} point(s)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{situationalQuestions.length}</p>
              <p className="text-sm text-muted-foreground">Situational</p>
              <p className="text-xs text-muted-foreground">{situationalQuestions.length * 5} point(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mcq" className="w-full">
        <TabsList>
          <TabsTrigger value="mcq">Multiple Choice ({mcqQuestions.length})</TabsTrigger>
          <TabsTrigger value="tf">True/False ({tfQuestions.length})</TabsTrigger>
          <TabsTrigger value="situational">Situational ({situationalQuestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mcq" className="space-y-4">
          {mcqQuestions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      <Badge variant="outline" className="mr-2">{q.source_type}</Badge>
                      {q.source_reference}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(q)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === q.id ? (
                  <Textarea
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    className="mb-2"
                  />
                ) : (
                  <p className="font-medium">{q.prompt}</p>
                )}
                
                {!editingId && (
                  <div className="space-y-1 text-sm">
                    <p><strong>A.</strong> {q.choice_a}</p>
                    <p><strong>B.</strong> {q.choice_b}</p>
                    <p><strong>C.</strong> {q.choice_c}</p>
                    <p><strong>D.</strong> {q.choice_d}</p>
                    <p className="mt-2 pt-2 border-t"><strong>Correct Answer:</strong> {q.correct_answer}</p>
                  </div>
                )}

                {q.source_excerpt && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <p className="font-medium mb-1">Source Excerpt:</p>
                    <p className="line-clamp-2">{q.source_excerpt}</p>
                  </div>
                )}

                {editingId === q.id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(q.id)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tf" className="space-y-4">
          {tfQuestions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      <Badge variant="outline" className="mr-2">{q.source_type}</Badge>
                      {q.source_reference}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(q)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === q.id ? (
                  <Textarea
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    className="mb-2"
                  />
                ) : (
                  <p className="font-medium">{q.prompt}</p>
                )}
                
                {!editingId && (
                  <p className="text-sm"><strong>Correct Answer:</strong> {q.correct_answer}</p>
                )}

                {q.source_excerpt && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <p className="font-medium mb-1">Source Excerpt:</p>
                    <p className="line-clamp-2">{q.source_excerpt}</p>
                  </div>
                )}

                {editingId === q.id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(q.id)}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="situational" className="space-y-4">
          {situationalQuestions.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Question {idx + 1}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      <Badge variant="outline" className="mr-2">{q.source_type}</Badge>
                      {q.source_reference}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(q)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingId === q.id ? (
                  <Textarea
                    value={editingPrompt}
                    onChange={(e) => setEditingPrompt(e.target.value)}
                    className="mb-2"
                  />
                ) : (
                  <p className="font-medium">{q.prompt}</p>
                )}
                
                {!editingId && q.evaluation_rubric && (
                  <div className="p-2 bg-muted rounded text-sm">
                    <p className="font-medium mb-1">Evaluation Rubric:</p>
                    <p className="whitespace-pre-wrap text-xs">{q.evaluation_rubric}</p>
                  </div>
                )}

                {q.source_excerpt && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <p className="font-medium mb-1">Source Excerpt:</p>
                    <p className="line-clamp-2">{q.source_excerpt}</p>
                  </div>
                )}

                {editingId === q.id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(q.id)}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {onPublish && (
        <Button onClick={onPublish} size="lg" className="w-full">
          Publish Batch
        </Button>
      )}
    </div>
  );
};
