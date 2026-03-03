import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

const QUIZ_DATES = [
  { label: '03.03.26', value: '2026-03-03' },
  { label: '03.04.26', value: '2026-03-04' },
  { label: '03.05.26', value: '2026-03-05' },
  { label: '03.06.26', value: '2026-03-06' },
];

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  correct_answer: string;
  source_article_title: string | null;
}

interface QuizSubmission {
  score: number;
  total: number;
  answers: { question_id: string; answer: string }[];
}

function QuizTab({ quizDate, userEmail, isAdmin }: { quizDate: string; userEmail: string; isAdmin: boolean }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadData();
  }, [quizDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load questions
      const { data: q } = await supabase
        .from('nb_quiz_questions')
        .select('*')
        .eq('quiz_date', quizDate)
        .order('question_number');

      setQuestions((q as QuizQuestion[]) || []);

      // Load existing submission
      const { data: s } = await supabase
        .from('nb_quiz_submissions')
        .select('*')
        .eq('agent_email', userEmail)
        .eq('quiz_date', quizDate)
        .maybeSingle();

      if (s) {
        setSubmission(s as unknown as QuizSubmission);
        setShowResults(true);
        // Restore answers
        const restored: Record<string, string> = {};
        ((s as any).answers as { question_id: string; answer: string }[]).forEach((a) => {
          restored[a.question_id] = a.answer;
        });
        setAnswers(restored);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-nb-quiz', {
        body: { quizDate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Questions generated!', description: `${data.count} questions created.` });
      await loadData();
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (questions.length === 0) return;

    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast({ title: 'Incomplete', description: `Please answer all ${questions.length} questions.`, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let score = 0;
      const answerEntries = questions.map((q) => {
        const userAnswer = (answers[q.id] || '').trim().toLowerCase();
        const correct = q.correct_answer.trim().toLowerCase();
        if (userAnswer === correct) score++;
        return { question_id: q.id, answer: answers[q.id]?.trim() || '' };
      });

      const { error } = await supabase.from('nb_quiz_submissions').insert({
        agent_email: userEmail,
        quiz_date: quizDate,
        answers: answerEntries,
        score,
        total: questions.length,
      } as any);

      if (error) throw error;

      setSubmission({ score, total: questions.length, answers: answerEntries });
      setShowResults(true);
      toast({ title: 'Quiz submitted!', description: `You scored ${score}/${questions.length}` });
    } catch (err: any) {
      toast({ title: 'Submit failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No questions yet
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground">No questions generated yet for this date.</p>
          {isAdmin && (
            <Button onClick={generateQuestions} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Questions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score card if submitted */}
      {showResults && submission && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-muted-foreground">Your Score</p>
              <p className="text-3xl font-bold">{submission.score}/{submission.total}</p>
            </div>
            <Badge variant={submission.score >= 8 ? 'default' : submission.score >= 5 ? 'secondary' : 'destructive'} className="text-lg px-4 py-1">
              {Math.round((submission.score / submission.total) * 100)}%
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {questions.map((q) => {
        const userAnswer = answers[q.id] || '';
        const isCorrect = showResults && submission
          ? userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
          : null;

        return (
          <Card key={q.id} className={showResults ? (isCorrect ? 'border-primary/30' : 'border-destructive/30') : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Question {q.question_number}</CardTitle>
                {showResults && (
                  isCorrect
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              {q.source_article_title && (
                <CardDescription className="text-xs">Source: {q.source_article_title}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{q.question_text}</p>
              <Input
                placeholder="Type your answer..."
                value={userAnswer}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                disabled={!!submission}
                className={showResults && !isCorrect ? 'border-destructive' : ''}
              />
              {showResults && !isCorrect && (
                <p className="text-sm text-primary">Correct answer: <strong>{q.correct_answer}</strong></p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Submit button */}
      {!submission && (
        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Quiz
        </Button>
      )}
    </div>
  );
}

export default function NBQuiz() {
  const { user, isAdmin: adminRole, isSuperAdmin, isHR } = useAuth();
  const isAdmin = adminRole || isSuperAdmin || isHR;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">NB Quiz</h1>
          <p className="text-muted-foreground">Fill-in-the-blank knowledge quiz from KB articles</p>
        </div>

        <Tabs defaultValue={QUIZ_DATES[0].value}>
          <TabsList className="grid grid-cols-4 w-full">
            {QUIZ_DATES.map((d) => (
              <TabsTrigger key={d.value} value={d.value}>{d.label}</TabsTrigger>
            ))}
          </TabsList>
          {QUIZ_DATES.map((d) => (
            <TabsContent key={d.value} value={d.value}>
              <QuizTab quizDate={d.value} userEmail={user?.email || ''} isAdmin={isAdmin} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}
