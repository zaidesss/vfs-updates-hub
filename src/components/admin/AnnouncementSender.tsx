import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Megaphone, Send, Loader2, Users, UserCheck, Shield, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { writeAuditLog } from '@/lib/auditLogApi';
import { useAuth } from '@/context/AuthContext';
import { EmailPreview } from './EmailPreview';

type RecipientGroup = 'all_users' | 'team_leads' | 'management' | 'custom';

interface RecipientOption {
  value: RecipientGroup;
  label: string;
  description: string;
  icon: typeof Users;
}

const RECIPIENT_OPTIONS: RecipientOption[] = [
  { value: 'all_users', label: 'All Users', description: 'Everyone with portal access', icon: Users },
  { value: 'team_leads', label: 'Team Leads', description: 'Users with Team Lead position', icon: UserCheck },
  { value: 'management', label: 'Management', description: 'Admins, Super Admins, and HR', icon: Shield },
  { value: 'custom', label: 'Custom', description: 'Enter specific email addresses', icon: Mail },
];

const SUBJECT_LIMIT = 200;
const BODY_LIMIT = 10000;

export function AnnouncementSender() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('all_users');
  const [customEmails, setCustomEmails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [senderName, setSenderName] = useState<string>('');

  // Fetch sender's full name on mount
  useEffect(() => {
    const fetchSenderName = async () => {
      if (!user?.email) return;
      
      const { data } = await supabase
        .from('agent_profiles')
        .select('full_name, agent_name')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();
      
      if (data?.full_name) {
        setSenderName(data.full_name);
      } else if (data?.agent_name) {
        setSenderName(data.agent_name);
      } else {
        setSenderName(user.email);
      }
    };

    fetchSenderName();
  }, [user?.email]);

  const getCustomEmailsArray = (): string[] => {
    if (!customEmails.trim()) return [];
    return customEmails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  };

  const fetchRecipientCount = async () => {
    setIsLoadingCount(true);
    try {
      let count = 0;

      switch (recipientGroup) {
        case 'all_users': {
          const { count: c } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true });
          count = c || 0;
          break;
        }
        case 'team_leads': {
          const { count: c } = await supabase
            .from('agent_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('position', 'Team Lead');
          count = c || 0;
          break;
        }
        case 'management': {
          const { count: c } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .in('role', ['admin', 'super_admin', 'hr']);
          count = c || 0;
          break;
        }
        case 'custom': {
          const emails = getCustomEmailsArray();
          count = [...new Set(emails)].length;
          break;
        }
      }

      setRecipientCount(count);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
      setRecipientCount(null);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const handleSendClick = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter the email body');
      return;
    }
    if (recipientGroup === 'custom' && getCustomEmailsArray().length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    await fetchRecipientCount();
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmDialog(false);
    setIsSending(true);

    try {
      const payload: {
        recipientGroup: RecipientGroup;
        customEmails?: string[];
        subject: string;
        body: string;
      } = {
        recipientGroup,
        subject: subject.trim(),
        body: body.trim(),
      };

      if (recipientGroup === 'custom') {
        payload.customEmails = getCustomEmailsArray();
      }

      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: payload,
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send announcement');
      }

      toast.success('Announcement sent successfully!', {
        description: `Sent to ${data.recipientCount} recipient(s)`,
      });

      writeAuditLog({
        area: 'Announcements',
        action_type: 'created',
        entity_label: subject,
        changed_by: user?.email || '',
        metadata: { recipient_group: recipientGroup, recipient_count: data.recipientCount },
      });

      // Reset form
      setSubject('');
      setBody('');
      setCustomEmails('');
      setRecipientGroup('all_users');
    } catch (error) {
      console.error('Error sending announcement:', error);
      const message = error instanceof Error ? error.message : 'Failed to send announcement';
      toast.error('Failed to send announcement', { description: message });
    } finally {
      setIsSending(false);
    }
  };

  const selectedOption = RECIPIENT_OPTIONS.find(o => o.value === recipientGroup);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Send Announcement</CardTitle>
              <CardDescription>Send an email announcement to selected recipients</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recipient-group">Recipients</Label>
              <Select value={recipientGroup} onValueChange={(v) => setRecipientGroup(v as RecipientGroup)}>
                <SelectTrigger id="recipient-group">
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOption && (
                <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject
                <span className="text-muted-foreground text-xs ml-2">
                  ({subject.length}/{SUBJECT_LIMIT})
                </span>
              </Label>
              <Input
                id="subject"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_LIMIT))}
              />
            </div>
          </div>

          {recipientGroup === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom-emails">
                Email Addresses
                <span className="text-muted-foreground text-xs ml-2">
                  (comma, semicolon, or newline separated)
                </span>
              </Label>
              <Textarea
                id="custom-emails"
                placeholder="email1@example.com, email2@example.com"
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                rows={2}
              />
              {customEmails && (
                <p className="text-xs text-muted-foreground">
                  {getCustomEmailsArray().length} valid email(s) detected
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">
              Email Body
              <span className="text-muted-foreground text-xs ml-2">
                ({body.length}/{BODY_LIMIT}) • Supports **bold**, *italic*, [links](url), and lists (- or 1.)
              </span>
            </Label>
            <Textarea
              id="body"
              placeholder="Write your announcement here...

**Bold text** for emphasis
*Italic text* for subtle emphasis
[Link text](https://example.com) for links

- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_LIMIT))}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSendClick} disabled={isSending || !subject.trim() || !body.trim()}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Announcement
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 p-6 pb-4">
            <DialogTitle>Confirm Send Announcement</DialogTitle>
            <DialogDescription>
              Review the email preview before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
            {/* Recipient info */}
            <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
              <span className="text-muted-foreground">Sending to:</span>
              <span className="font-medium">
                {isLoadingCount ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                  `${recipientCount ?? 0} ${selectedOption?.label ?? ''}`
                )}
              </span>
            </div>

            {/* Full email preview */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Email Preview:</p>
              <EmailPreview 
                senderName={senderName || user?.email || 'Unknown'}
                subject={subject}
                body={body}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSend} disabled={isLoadingCount}>
              <Send className="h-4 w-4 mr-2" />
              Send to {recipientCount ?? 0} recipient(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
