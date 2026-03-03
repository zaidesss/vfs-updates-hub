import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
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
import { Loader2, CheckCircle2, XCircle, Sparkles, EyeOff, Trophy, Clock, Lock, Users, RefreshCw, Pencil, Check, X } from 'lucide-react';

const QUIZ_DATES = [
  { label: '03.03.26', value: '2026-03-03' },
  { label: '03.04.26', value: '2026-03-04' },
  { label: '03.05.26', value: '2026-03-05' },
  { label: '03.06.26', value: '2026-03-06' },
];

const DELAY_SECONDS = 2 * 60; // 2 minutes delay before timer starts
const TIMER_SECONDS = 20 * 60; // 20 minutes quiz time
const TOTAL_SECONDS = DELAY_SECONDS + TIMER_SECONDS; // total window from started_at

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
  gradeResults?: Record<string, boolean>;
}

interface ScoreSummaryRow {
  agent_email: string;
  agent_name: string;
  score: number;
  total: number;
  answers?: { question_id: string; answer: string }[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function ScoresSummaryTable({ quizDate, isAdmin, questions }: { quizDate: string; isAdmin: boolean; questions: QuizQuestion[] }) {
  const [rows, setRows] = useState<ScoreSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: submissions } = await supabase
        .from('nb_quiz_submissions')
        .select('agent_email, score, total, answers')
        .eq('quiz_date', quizDate)
        .order('score', { ascending: false });

      if (!submissions || submissions.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

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
          answers: s.answers as any,
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
            {rows.map((r, i) => {
              const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
              const isExpanded = isAdmin && expandedEmail === r.agent_email;
              return (
                <Fragment key={r.agent_email}>
                  <TableRow
                    className={isAdmin ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={() => isAdmin && setExpandedEmail(isExpanded ? null : r.agent_email)}
                  >
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell>
                      {r.agent_name}
                      {isAdmin && (
                        <span className={`text-xs text-muted-foreground ml-1 inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.score}/{r.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pct >= 80 ? 'default' : pct >= 50 ? 'secondary' : 'destructive'}>
                        {pct}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && r.answers && questions.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <div className="bg-muted/30 border-t px-4 py-3 space-y-2.5">
                          {questions.map((q) => {
                            const entry = (r.answers || []).find((a: any) => a.question_id === q.id);
                            const agentAnswer = entry?.answer || '(no answer)';
                            const isMatch = agentAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                            return (
                              <div key={q.id} className="text-sm">
                                <p className="text-xs text-muted-foreground font-medium">Q{q.question_number}: {q.question_text}</p>
                                <div className="flex flex-wrap items-start gap-x-6 gap-y-0.5 pl-2 mt-0.5">
                                  <p>
                                    <span className="text-xs text-muted-foreground">Agent: </span>
                                    <span className={isMatch ? 'text-primary font-medium' : 'text-destructive font-medium'}>{agentAnswer}</span>
                                  </p>
                                  <p>
                                    <span className="text-xs text-muted-foreground">Correct: </span>
                                    <span className="font-medium">{q.correct_answer}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function useQuizTimer(quizDate: string, userEmail: string, isAdmin: boolean) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [phase, setPhase] = useState<'loading' | 'delay' | 'active' | 'expired'>('loading');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const computeState = useCallback((startedAt: Date) => {
    const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    if (elapsed < DELAY_SECONDS) {
      // Still in the 2-min delay phase
      setPhase('delay');
      setSecondsLeft(DELAY_SECONDS - elapsed);
    } else if (elapsed < TOTAL_SECONDS) {
      // Active quiz time
      setPhase('active');
      setSecondsLeft(TOTAL_SECONDS - elapsed);
    } else {
      setPhase('expired');
      setSecondsLeft(0);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setPhase('active');
      setSecondsLeft(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      // Check if timer already started
      const { data: existing } = await supabase
        .from('nb_quiz_timer_starts')
        .select('started_at')
        .eq('agent_email', userEmail)
        .eq('quiz_date', quizDate)
        .maybeSingle();

      if (cancelled) return;

      let startedAt: Date;

      if (existing) {
        startedAt = new Date((existing as any).started_at);
      } else {
        // Insert new timer start
        const { data: inserted, error } = await supabase
          .from('nb_quiz_timer_starts')
          .insert({ agent_email: userEmail, quiz_date: quizDate } as any)
          .select('started_at')
          .single();

        if (cancelled) return;

        if (error) {
          // Race condition - another tab inserted first, re-fetch
          const { data: refetched } = await supabase
            .from('nb_quiz_timer_starts')
            .select('started_at')
            .eq('agent_email', userEmail)
            .eq('quiz_date', quizDate)
            .maybeSingle();
          if (cancelled) return;
          startedAt = new Date((refetched as any)?.started_at || Date.now());
        } else {
          startedAt = new Date((inserted as any).started_at);
        }
      }

      computeState(startedAt);

      // Tick every second
      intervalRef.current = setInterval(() => {
        computeState(startedAt);
      }, 1000);
    };

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [quizDate, userEmail, isAdmin, computeState]);

  // Clear interval when expired
  useEffect(() => {
    if (phase === 'expired' && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [phase]);

  return { secondsLeft, phase };
}

function TimerBadge({ phase, secondsLeft }: { phase: string; secondsLeft: number | null }) {
  if (phase === 'delay' && secondsLeft !== null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Quiz starts in <strong>{formatTime(secondsLeft)}</strong></span>
      </div>
    );
  }
  if (phase === 'active' && secondsLeft !== null) {
    const isLow = secondsLeft <= 120;
    return (
      <div className={`flex items-center gap-2 text-sm ${isLow ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
        <Clock className="h-4 w-4" />
        <span>Time remaining: <strong>{formatTime(secondsLeft)}</strong></span>
      </div>
    );
  }
  return null;
}

interface AgentTimerRow {
  agent_email: string;
  agent_name: string;
  started_at: string;
}

function AgentTimerMonitor({ quizDate }: { quizDate: string }) {
  const [rows, setRows] = useState<AgentTimerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: timers } = await supabase
        .from('nb_quiz_timer_starts')
        .select('agent_email, started_at')
        .eq('quiz_date', quizDate);

      if (!timers || timers.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const emails = timers.map((t: any) => t.agent_email);
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('email, agent_name, full_name')
        .in('email', emails);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.email.toLowerCase()] = p.agent_name || p.full_name || p.email;
      });

      setRows(
        timers.map((t: any) => ({
          agent_email: t.agent_email,
          agent_name: nameMap[t.agent_email.toLowerCase()] || t.agent_email,
          started_at: t.started_at,
        })).sort((a: AgentTimerRow, b: AgentTimerRow) => a.agent_name.localeCompare(b.agent_name))
      );
      setLoading(false);
    };
    load();
  }, [quizDate]);

  // Tick every second to update countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Agent Timers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No agents have started this quiz yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Agent Timers ({rows.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right w-40">Time Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const elapsed = Math.floor((Date.now() - new Date(r.started_at).getTime()) / 1000);
              let label: string;
              let className = 'text-muted-foreground';

              if (elapsed < DELAY_SECONDS) {
                const left = DELAY_SECONDS - elapsed;
                label = `Preparing (${formatTime(left)})`;
                className = 'text-muted-foreground';
              } else if (elapsed < TOTAL_SECONDS) {
                const left = TOTAL_SECONDS - elapsed;
                label = formatTime(left);
                if (left <= 120) className = 'text-destructive font-semibold';
                else className = 'text-primary font-medium';
              } else {
                label = 'Expired';
                className = 'text-muted-foreground line-through';
              }

              return (
                <TableRow key={r.agent_email}>
                  <TableCell className="text-sm">{r.agent_name}</TableCell>
                  <TableCell className={`text-right text-sm ${className}`}>{label}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuestionCard({
  question: q,
  userAnswer,
  isCorrect,
  showResults,
  isAdmin,
  hasSubmission,
  onAnswerChange,
  onQuestionUpdated,
}: {
  question: QuizQuestion;
  userAnswer: string;
  isCorrect: boolean | null;
  showResults: boolean;
  isAdmin: boolean;
  hasSubmission: boolean;
  onAnswerChange: (val: string) => void;
  onQuestionUpdated: (q: QuizQuestion) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(q.question_text);
  const [editAnswer, setEditAnswer] = useState(q.correct_answer);
  const [editSource, setEditSource] = useState(q.source_article_title || '');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditText(q.question_text);
    setEditAnswer(q.correct_answer);
    setEditSource(q.source_article_title || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('nb_quiz_questions')
        .update({
          question_text: editText.trim(),
          correct_answer: editAnswer.trim(),
          source_article_title: editSource.trim() || null,
        } as any)
        .eq('id', q.id);
      if (error) throw error;
      onQuestionUpdated({ ...q, question_text: editText.trim(), correct_answer: editAnswer.trim(), source_article_title: editSource.trim() || null });
      setEditing(false);
      toast({ title: 'Question updated' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={showResults ? (isCorrect ? 'border-primary/30' : 'border-destructive/30') : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">Question {q.question_number}</CardTitle>
          <div className="flex items-center gap-1">
            {showResults && (
              isCorrect
                ? <CheckCircle2 className="h-5 w-5 text-primary" />
                : <XCircle className="h-5 w-5 text-destructive" />
            )}
            {isAdmin && !editing && (
              <button onClick={startEdit} className="p-1 rounded hover:bg-muted" title="Edit question">
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        {!editing && q.source_article_title && (
          <CardDescription className="text-xs">Source: {q.source_article_title}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Question Text</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Correct Answer</label>
              <Input value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Source Article</label>
              <Input value={editSource} onChange={(e) => setEditSource(e.target.value)} placeholder="(optional)" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving || !editText.trim() || !editAnswer.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{q.question_text}</p>
            {isAdmin && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                <span className="font-medium">Answer:</span> {q.correct_answer}
              </p>
            )}
          </>
        )}
        {!editing && (
          <>
            <Input
              placeholder="Type your answer..."
              value={userAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              disabled={hasSubmission}
              className={showResults && !isCorrect ? 'border-destructive' : ''}
            />
            {showResults && (
              <p className={`text-sm ${isCorrect ? 'text-primary' : 'text-destructive'}`}>
                Correct answer: <strong>{q.correct_answer}</strong>
              </p>
            )}
          </>
        )}
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
  const [regrading, setRegrading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState(0);

  const { secondsLeft, phase } = useQuizTimer(quizDate, userEmail, isAdmin);

  useEffect(() => {
    loadData();
  }, [quizDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from('nb_quiz_settings')
        .select('is_visible')
        .eq('quiz_date', quizDate)
        .maybeSingle();

      setIsVisible((settings as any)?.is_visible ?? false);

      const { data: q } = await supabase
        .from('nb_quiz_questions')
        .select('*')
        .eq('quiz_date', quizDate)
        .order('question_number');

      setQuestions((q as QuizQuestion[]) || []);

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
      // Prepare items for AI grading
      const gradeItems = questions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        agent_answer: (answers[q.id] || '').trim(),
      }));

      // Call AI grading edge function
      const { data: gradeData, error: gradeError } = await supabase.functions.invoke('grade-nb-quiz', {
        body: { items: gradeItems },
      });

      if (gradeError) throw new Error(gradeError.message || 'Grading failed');
      if (gradeData?.error) throw new Error(gradeData.error);

      const gradeResults: Record<string, boolean> = gradeData.results || {};
      let score = 0;
      const answerEntries = questions.map((q) => {
        if (gradeResults[q.id]) score++;
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

      setSubmission({ score, total: questions.length, answers: answerEntries, gradeResults });
      setShowResults(true);
      setRefreshSummary((c) => c + 1);
      toast({ title: 'Quiz submitted!', description: `You scored ${score}/${questions.length}` });
    } catch (err: any) {
      toast({ title: 'Submit failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Timer expired - lock out non-admin users
  if (phase === 'expired' && !isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Lock className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold">Time's Up!</p>
          <p className="text-muted-foreground text-sm text-center">
            The 20-minute quiz window has expired. You can no longer access this quiz.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Quiz hidden for non-admins
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

  // Delay phase - waiting for quiz to unlock
  if (phase === 'delay') {
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
        {isAdmin && <AgentTimerMonitor quizDate={quizDate} />}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Clock className="h-10 w-10 text-primary animate-pulse" />
            <p className="text-lg font-semibold">Quiz is preparing...</p>
            <p className="text-muted-foreground text-sm text-center">
              The quiz will be available in <strong>{formatTime(secondsLeft ?? 0)}</strong>
            </p>
            <p className="text-xs text-muted-foreground">Please stay on this page. The quiz will appear automatically.</p>
          </CardContent>
        </Card>
      </div>
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
        {isAdmin && <AgentTimerMonitor quizDate={quizDate} />}
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

      {/* Admin re-grade & timer monitor */}
      {isAdmin && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Re-grade All Submissions (AI)</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={regrading}
              onClick={async () => {
                setRegrading(true);
                try {
                  // Fetch all submissions for this date
                  const { data: subs } = await supabase
                    .from('nb_quiz_submissions')
                    .select('id, agent_email, answers')
                    .eq('quiz_date', quizDate);
                  if (!subs || subs.length === 0) {
                    toast({ title: 'No submissions to re-grade' });
                    return;
                  }

                  let updated = 0;
                  for (const sub of subs) {
                    const subAnswers = sub.answers as any[];
                    const items = questions.map((q) => {
                      const entry = subAnswers.find((a: any) => a.question_id === q.id);
                      return {
                        question_id: q.id,
                        question_text: q.question_text,
                        correct_answer: q.correct_answer,
                        agent_answer: entry?.answer || '',
                      };
                    });

                    const { data: gradeData, error: gradeErr } = await supabase.functions.invoke('grade-nb-quiz', {
                      body: { items },
                    });
                    console.log('Grade response for', sub.agent_email, { gradeData, gradeErr });
                    if (gradeErr || gradeData?.error) {
                      console.error('Grade error for', sub.agent_email, gradeErr, gradeData?.error);
                      continue;
                    }

                    const results: Record<string, boolean> = gradeData.results || {};
                    const newScore = questions.filter((q) => results[q.id] === true).length;

                    await supabase
                      .from('nb_quiz_submissions')
                      .update({ score: newScore } as any)
                      .eq('id', sub.id);
                    updated++;
                  }

                  toast({ title: 'Re-grading complete', description: `Updated ${updated} submission(s)` });
                  setRefreshSummary((c) => c + 1);
                } catch (err: any) {
                  toast({ title: 'Re-grade failed', description: err.message, variant: 'destructive' });
                } finally {
                  setRegrading(false);
                }
              }}
            >
              {regrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {regrading ? 'Re-grading...' : 'Re-grade'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin agent timer monitor */}
      {isAdmin && <AgentTimerMonitor quizDate={quizDate} />}

      {/* Timer display for non-admins */}
      {!isAdmin && phase === 'active' && (
        <Card className={secondsLeft !== null && secondsLeft <= 120 ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30 bg-primary/5'}>
          <CardContent className="flex items-center justify-center py-3">
            <TimerBadge phase={phase} secondsLeft={secondsLeft} />
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
          ? (submission.gradeResults ? submission.gradeResults[q.id] === true : userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase())
          : null;

        return (
          <QuestionCard
            key={q.id}
            question={q}
            userAnswer={userAnswer}
            isCorrect={isCorrect}
            showResults={showResults}
            isAdmin={isAdmin}
            hasSubmission={!!submission}
            onAnswerChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
            onQuestionUpdated={(updated) => setQuestions((prev) => prev.map((qq) => qq.id === updated.id ? updated : qq))}
          />
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
      <ScoresSummaryTable key={refreshSummary} quizDate={quizDate} isAdmin={isAdmin} questions={questions} />
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

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Purpose of This Quiz</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This quiz is designed to evaluate and strengthen your capabilities as a support agent. Specifically, it aims to:
            </p>
            <ul className="grid gap-1.5 text-sm text-foreground list-disc pl-5">
              <li>Test your <strong>knowledge</strong> of processes, policies, and product information</li>
              <li>Test your <strong>retention</strong> of key details from KB articles and updates</li>
              <li>Test your <strong>critical thinking</strong> when applying knowledge to real scenarios</li>
              <li>Test your <strong>efficiency</strong> in answering under time pressure</li>
              <li>Test your <strong>reading and comprehension</strong> skills</li>
              <li>Test how fast you can <strong>analyze and respond</strong> to customer concerns</li>
              <li>Test how quickly you can <strong>comprehend an issue</strong> and identify the right course of action</li>
              <li>Build <strong>confidence</strong> in handling diverse ticket types independently</li>
              <li>Identify <strong>knowledge gaps</strong> for targeted coaching and improvement</li>
            </ul>
            <div className="mt-2 rounded-md bg-background/60 border border-border/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground">⏱ How the Timer Works</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>Once you open a quiz tab, a <strong>2-minute preparation window</strong> begins. Use this time to get ready — the questions are not yet visible.</li>
                <li>After the 2-minute delay, the quiz unlocks and a <strong>20-minute countdown</strong> starts. This is your time to read and answer all questions.</li>
                <li>When the 20 minutes are up, the quiz is <strong>automatically locked</strong> — you will no longer be able to view or submit answers.</li>
                <li>You are free to <strong>check your notes</strong>, switch to other tabs, or navigate to other pages to look something up — however, the timer <strong>will continue running</strong> in the background.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

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
