import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  CheckCircle2,
  Circle
} from 'lucide-react';
import { format } from 'date-fns';

export default function UpdateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUpdateById, isAcknowledged, getAcknowledgement, acknowledgeUpdate } = useUpdates();

  const update = getUpdateById(id || '');
  const acknowledged = user ? isAcknowledged(id || '', user.email) : false;
  const acknowledgement = user ? getAcknowledgement(id || '', user.email) : undefined;

  if (!update) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Update not found</h2>
          <Button variant="ghost" onClick={() => navigate('/updates')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Updates
          </Button>
        </div>
      </Layout>
    );
  }

  const handleAcknowledge = async () => {
    if (user && !acknowledged) {
      await acknowledgeUpdate(update.id, user.email);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/updates')}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Updates
        </Button>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {acknowledged ? (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-foreground">{update.title}</h1>
                <p className="text-muted-foreground mt-2">{update.summary}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>Posted by {update.posted_by}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(update.posted_at), 'MMMM d, yyyy')}</span>
              </div>
              {update.deadline_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Due {format(new Date(update.deadline_at), 'MMM d, h:mm a')}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none text-foreground">
              {update.body.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-lg font-semibold mt-4 mb-2">{paragraph.replace('## ', '')}</h2>;
                }
                if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-base font-semibold mt-3 mb-1">{paragraph.replace('### ', '')}</h3>;
                }
                if (paragraph.startsWith('- ')) {
                  return <li key={index} className="ml-4 text-muted-foreground">{paragraph.replace('- ', '')}</li>;
                }
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <p key={index} className="font-semibold text-foreground">{paragraph.replace(/\*\*/g, '')}</p>;
                }
                if (paragraph.trim()) {
                  return <p key={index} className="text-muted-foreground mb-2">{paragraph}</p>;
                }
                return null;
              })}
            </div>

            {update.help_center_url && (
              <div className="mt-6 p-4 bg-accent/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Help Center Article</p>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href={update.help_center_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Article
                  </a>
                </Button>
              </div>
            )}
          </CardContent>

          <Separator />

          <CardContent className="pt-6">
            {acknowledged && acknowledgement ? (
              <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">You acknowledged this update</p>
                  <p className="text-sm text-muted-foreground">
                    on {format(new Date(acknowledgement.acknowledged_at), 'MMMM d, yyyy at h:mm a')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  After reviewing this update and the linked article, click below to confirm you've read and understood the content.
                </p>
                <Button onClick={handleAcknowledge} size="lg" className="w-full sm:w-auto">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Acknowledge Update
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
