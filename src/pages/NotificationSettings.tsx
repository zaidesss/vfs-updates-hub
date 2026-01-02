import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Calendar, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface NotificationSettings {
  email_notifications: boolean;
  in_app_notifications: boolean;
  updates_notifications: boolean;
  leave_notifications: boolean;
  question_notifications: boolean;
  request_notifications: boolean;
}

const defaultSettings: NotificationSettings = {
  email_notifications: true,
  in_app_notifications: true,
  updates_notifications: true,
  leave_notifications: true,
  question_notifications: true,
  request_notifications: true,
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_email', user.email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          in_app_notifications: data.in_app_notifications,
          updates_notifications: data.updates_notifications,
          leave_notifications: data.leave_notifications,
          question_notifications: data.question_notifications,
          request_notifications: data.request_notifications,
        });
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    // Ensure at least one of email or in_app is enabled
    if (key === 'email_notifications' && settings.email_notifications && !settings.in_app_notifications) {
      toast.error('At least one notification method must be enabled');
      return;
    }
    if (key === 'in_app_notifications' && settings.in_app_notifications && !settings.email_notifications) {
      toast.error('At least one notification method must be enabled');
      return;
    }

    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_email', user.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_settings')
          .update(settings)
          .eq('user_email', user.email.toLowerCase());
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert({
            user_email: user.email.toLowerCase(),
            ...settings,
          });
        if (error) throw error;
      }

      toast.success('Notification settings saved');
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">Manage how you receive notifications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Methods
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified. At least one method must be enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                id="email"
                checked={settings.email_notifications}
                onCheckedChange={() => handleToggle('email_notifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="in_app">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">See notifications in the app</p>
                </div>
              </div>
              <Switch
                id="in_app"
                checked={settings.in_app_notifications}
                onCheckedChange={() => handleToggle('in_app_notifications')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="updates">Updates</Label>
                  <p className="text-sm text-muted-foreground">New updates and announcements</p>
                </div>
              </div>
              <Switch
                id="updates"
                checked={settings.updates_notifications}
                onCheckedChange={() => handleToggle('updates_notifications')}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="leave">Leave Requests</Label>
                  <p className="text-sm text-muted-foreground">Leave request approvals and decisions</p>
                </div>
              </div>
              <Switch
                id="leave"
                checked={settings.leave_notifications}
                onCheckedChange={() => handleToggle('leave_notifications')}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="questions">Questions</Label>
                  <p className="text-sm text-muted-foreground">Replies to your questions</p>
                </div>
              </div>
              <Switch
                id="questions"
                checked={settings.question_notifications}
                onCheckedChange={() => handleToggle('question_notifications')}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="requests">Article Requests</Label>
                  <p className="text-sm text-muted-foreground">Request approvals and updates</p>
                </div>
              </div>
              <Switch
                id="requests"
                checked={settings.request_notifications}
                onCheckedChange={() => handleToggle('request_notifications')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
