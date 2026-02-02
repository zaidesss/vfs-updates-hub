import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, FileText, TrendingUp } from 'lucide-react';
import { formatDisplayDateTime } from '@/components/ui/date-picker';

export default function Activity() {
  const { user } = useAuth();
  const { updates, isAcknowledged, getAcknowledgement, ensureLoaded } = useUpdates();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const publishedUpdates = updates.filter(u => u.status === 'published');

  const stats = useMemo(() => {
    const acknowledged = publishedUpdates.filter(u => isAcknowledged(u.id, user?.email || ''));
    const pending = publishedUpdates.filter(u => !isAcknowledged(u.id, user?.email || ''));
    const completionRate = publishedUpdates.length > 0 
      ? Math.round((acknowledged.length / publishedUpdates.length) * 100) 
      : 0;

    return {
      total: publishedUpdates.length,
      acknowledged: acknowledged.length,
      pending: pending.length,
      completionRate,
    };
  }, [publishedUpdates, isAcknowledged, user?.email]);

  const acknowledgedUpdates = useMemo(() => {
    return publishedUpdates
      .filter(u => isAcknowledged(u.id, user?.email || ''))
      .map(u => ({
        ...u,
        acknowledgement: getAcknowledgement(u.id, user?.email || ''),
      }))
      .sort((a, b) => {
        const aTime = a.acknowledgement ? new Date(a.acknowledgement.acknowledged_at).getTime() : 0;
        const bTime = b.acknowledgement ? new Date(b.acknowledgement.acknowledged_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [publishedUpdates, isAcknowledged, getAcknowledgement, user?.email]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Activity</h1>
          <p className="text-muted-foreground mt-1">
            Track your progress on updates and acknowledgements
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Updates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.acknowledged}</p>
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {stats.acknowledged} of {stats.total} updates acknowledged
                </span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acknowledgement History</CardTitle>
          </CardHeader>
          <CardContent>
            {acknowledgedUpdates.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <Circle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No acknowledgements yet</p>
                <Link to="/updates" className="text-primary text-sm hover:underline mt-1 block">
                  View pending updates
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {acknowledgedUpdates.map((update) => (
                  <Link
                    key={update.id}
                    to={`/updates/${update.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{update.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Acknowledged {update.acknowledgement && formatDisplayDateTime(update.acknowledgement.acknowledged_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">Read</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
