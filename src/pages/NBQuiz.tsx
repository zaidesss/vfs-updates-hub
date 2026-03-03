import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Sparkles, EyeOff, Trophy } from 'lucide-react';

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

interface ScoreSummaryRow {
  agent_email: string;
  agent_name: string;
  score: number;
  total: number;
}

function ScoresSummaryTable({ quizDate }: { quizDate: string }) {
  const [rows, setRows] = useState<ScoreSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: submissions } = await supabase
        .from('nb_quiz_submissions')
        .select('agent_email, score, total')
        .eq('quiz_date', quizDate)
        .order('score', { ascending: false });

      if (!submissions || submissions.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Fetch agent names from profiles
      const emails = submissions.map((s) => s.agent_email);
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('email, agent_name, full_name')
        .in('email', emails);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.email.toLowerCase()] = p.agent_name || p.full_name || p.email;
      });

      setRows(
        submissions.map((s) => ({
          agent_email: s.agent_email,
          agent_name: nameMap[s.agent_email.toLowerCase()] || s.agent_email,
          score: s.score,
          total: s.total,
        }))
      );
      setLoading(false);
    };
    load();
  }, [quizDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Scores Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right w-24">Score</TableHead>
              <TableHead className="text-right w-24">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.agent_email}>
                <TableCell className="font-medium">{i + 1}</TableCell>
                <TableCell>{r.agent_name}</TableCell>
                <TableCell className="text-right">{r.score}/{r.total}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.score / r.total >= 0.8 ? 'default' : r.score / r.total >= 0.5 ? 'secondary' : 'destructive'}>
                    {Math.round((r.score / r.total) * 100)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuizTab({ quizDate, userEmail, isAdmin }: { quizDate: string; userEmail: string; isAdmin: boolean }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState(0);

  useEffect(() => {
    loadData();
  }, [quizDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load visibility setting
      const { data: settings } = await supabase
        .from('nb_quiz_settings')
        .select('is_visible')
        .eq('quiz_date', quizDate)
        .maybeSingle();

      setIsVisible((settings as any)?.is_visible ?? false);

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

  const toggleVisibility = async () => {
    setTogglingVisibility(true);
    try {
      const newVal = !isVisible;
      const { error } = await supabase
        .from('nb_quiz_settings')
        .update({ is_visible: newVal, updated_at: new Date().toISOString() } as any)
        .eq('quiz_date', quizDate);

      if (error) throw error;
      setIsVisible(newVal);
      toast({ title: newVal ? 'Quiz is now visible to all users' : 'Quiz is now hidden from non-admins' });
    } catch (err: any) {
      toast({ title: 'Failed to update visibility', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingVisibility(false);
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
      setRefreshSummary((c) => c + 1);
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

  // If quiz is hidden and user is not admin, show message
  if (!isVisible && !isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
          <EyeOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">This quiz is not yet available.</p>
        </CardContent>
      </Card>
    );
  }

  // No questions yet
  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        {isAdmin && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Quiz Visibility</span>
                <Badge variant={isVisible ? 'default' : 'secondary'}>{isVisible ? 'Visible' : 'Hidden'}</Badge>
              </div>
              <Switch checked={isVisible} onCheckedChange={toggleVisibility} disabled={togglingVisibility} />
            </CardContent>
          </Card>
        )}
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin visibility toggle */}
      {isAdmin && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Quiz Visibility</span>
              <Badge variant={isVisible ? 'default' : 'secondary'}>{isVisible ? 'Visible' : 'Hidden'}</Badge>
            </div>
            <Switch checked={isVisible} onCheckedChange={toggleVisibility} disabled={togglingVisibility} />
          </CardContent>
        </Card>
      )}

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

      {/* Scores summary table */}
      <ScoresSummaryTable key={refreshSummary} quizDate={quizDate} />
    </div>
  );
}

export default function NBQuiz() {
  const { user, isAdmin: adminRole, isSuperAdmin, isHR } = useAuth();
  const isAdmin = adminRole || isSuperAdmin || isHR;
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('nb_quiz_settings')
        .select('quiz_date, is_visible');
      const map: Record<string, boolean> = {};
      (data || []).forEach((d: any) => { map[d.quiz_date] = d.is_visible; });
      setVisibilityMap(map);
    };
    load();
  }, []);

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
              <TabsTrigger key={d.value} value={d.value} className="flex items-center gap-1">
                {d.label}
                {isAdmin && visibilityMap[d.value] === false && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                    <EyeOff className="h-3 w-3" />
                  </Badge>
                )}
              </TabsTrigger>
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
