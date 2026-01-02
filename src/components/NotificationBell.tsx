import { useState, useEffect } from 'react';
import { Bell, Check, MessageSquare, FileText, Calendar, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { getUpdateById } = useUpdates();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', user.email.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read_at).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_email=eq.${user?.email?.toLowerCase()}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Always mark as read when clicked
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // Navigate based on reference type
    if (notification.reference_type === 'update' && notification.reference_id) {
      // Check if update still exists
      const update = getUpdateById(notification.reference_id);
      if (!update) {
        toast.info('This update is no longer available', {
          description: 'It may have been removed or archived.',
        });
        setOpen(false);
        return;
      }
      navigate(`/updates/${notification.reference_id}`);
    } else if (notification.reference_type === 'question' && notification.reference_id) {
      // Check if the update for this question exists
      const update = getUpdateById(notification.reference_id);
      if (!update) {
        toast.info('This update is no longer available', {
          description: 'It may have been removed or archived.',
        });
        setOpen(false);
        return;
      }
      navigate('/updates');
    } else if (notification.reference_type === 'leave_request') {
      navigate('/leave-request');
    } else if (notification.reference_type === 'request') {
      navigate('/requests');
    } else if (notification.reference_type === 'failed_emails') {
      // System notification about failed emails - just close
      setOpen(false);
      return;
    }

    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'question_reply':
      case 'question_status':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'new_update':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'leave_decision':
        return <Calendar className="h-4 w-4 text-green-500" />;
      case 'request_approval':
      case 'request_status':
      case 'request_pending':
        return <CheckCircle className="h-4 w-4 text-amber-500" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setOpen(false);
                navigate('/notification-settings');
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                    !notification.read_at && 'bg-primary/5'
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        !notification.read_at && 'font-medium'
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
