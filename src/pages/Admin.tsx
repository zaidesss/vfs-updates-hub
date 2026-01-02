import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  FileText, 
  Users, 
  CheckCircle2, 
  Circle, 
  Download,
  Eye,
  RefreshCw,
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  Pencil,
  Search,
  Sparkles,
  MessageSquare,
  ExternalLink,
  KeyRound,
  Copy,
  Mail,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { Update, UpdateQuestion } from '@/types';
import { fetchAdmins, addAdmin, removeAdmin, fetchUsers, addUser, removeUser, bulkAddUsers, AdminRole, createUserWithPassword, changeUserEmail, forcePasswordReset } from '@/lib/api';
import { deleteUpdate } from '@/lib/requestApi';
import { toast } from 'sonner';
import { getDefaultDeadline } from '@/lib/dateUtils';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { EditUpdateDialog } from '@/components/EditUpdateDialog';
import { SimilarUpdatesModal } from '@/components/SimilarUpdatesModal';
import { CATEGORIES, UpdateCategory } from '@/lib/categories';
import { supabase } from '@/integrations/supabase/client';

export default function Admin() {
  const { isAdmin, isHR, user } = useAuth();
  const { updates, acknowledgements, getAcknowledgementCount, getAcknowledgementsForUpdate, createUpdate, editUpdate, updateUpdateStatus, refreshData, isLoading } = useUpdates();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [admins, setAdmins] = useState<AdminRole[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [removingAdminEmail, setRemovingAdminEmail] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminRole[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [removingUserEmail, setRemovingUserEmail] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<(UpdateQuestion & { update_title?: string; reference_number?: string })[]>([]);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingUpdate, setIsCreatingUpdate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'obsolete'>('all');
  const [isChangeEmailDialogOpen, setIsChangeEmailDialogOpen] = useState(false);
  const [changeEmailData, setChangeEmailData] = useState({ oldEmail: '', newEmail: '' });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [resettingPasswordEmail, setResettingPasswordEmail] = useState<string | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user' | 'hr',
  });
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    summary: '',
    body: '',
    help_center_url: '',
    posted_by: user?.email || '',
    deadline_at: getDefaultDeadline(),
    status: 'draft' as Update['status'],
    category: '' as UpdateCategory | '',
  });

  // Auto-populate Posted By when user changes
  useEffect(() => {
    if (user?.email) {
      setNewUpdate(prev => ({ ...prev, posted_by: user.email }));
    }
  }, [user?.email]);

  // Total users count from user_roles
  const totalUsers = users.length;

  const getNameByEmail = (email: string) => {
    return getKnownNameByEmail(email) || email;
  };
  // Load admins on mount
  useEffect(() => {
    loadAdmins();
    loadUsers();
    loadQuestions();
  }, []);

  const loadAdmins = async () => {
    const { data } = await fetchAdmins();
    if (data) {
      setAdmins(data);
    }
  };

  const loadUsers = async () => {
    const { data } = await fetchUsers();
    if (data) {
      setUsers(data);
    }
  };

  const loadQuestions = async () => {
    const { data: questionsData, error } = await supabase
      .from('update_questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading questions:', error);
      return;
    }

    // Enrich with update titles
    const enrichedQuestions = await Promise.all(
      (questionsData || []).map(async (q) => {
        const update = updates.find(u => u.id === q.update_id);
        return {
          ...q,
          update_title: update?.title || 'Unknown Update',
          reference_number: (q as any).reference_number || null,
        };
      })
    );
    
    setQuestions(enrichedQuestions);
  };

  // Reload questions when updates change
  useEffect(() => {
    if (updates.length > 0) {
      loadQuestions();
    }
  }, [updates]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    
    setIsAddingAdmin(true);
    const { data, error } = await addAdmin(newAdminEmail.trim());
    setIsAddingAdmin(false);

    if (error) {
      toast.error('Failed to add admin', { description: error });
      return;
    }

    if (data) {
      setAdmins(prev => [...prev, data]);
      setNewAdminEmail('');
      toast.success('Admin added successfully');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    // Prevent removing yourself
    if (user?.email?.toLowerCase() === email.toLowerCase()) {
      toast.error('Cannot remove yourself as admin');
      return;
    }

    setRemovingAdminEmail(email);
    const { error } = await removeAdmin(email);
    setRemovingAdminEmail(null);

    if (error) {
      toast.error('Failed to remove admin', { description: error });
      return;
    }

    setAdmins(prev => prev.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
    toast.success('Admin removed successfully');
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;
    
    setIsAddingUser(true);
    const { data, error } = await addUser(newUserEmail.trim());
    setIsAddingUser(false);

    if (error) {
      toast.error('Failed to add user', { description: error });
      return;
    }

    if (data) {
      setUsers(prev => [...prev, data]);
      setNewUserEmail('');
      toast.success('User added successfully');
    }
  };

  const handleCreateUserWithPassword = async () => {
    if (!newUserData.email.trim() || !newUserData.password.trim() || !newUserData.name.trim()) return;
    
    setIsCreatingUser(true);
    const { data, error } = await createUserWithPassword(
      newUserData.email.trim(),
      newUserData.password.trim(),
      newUserData.name.trim(),
      newUserData.role
    );
    setIsCreatingUser(false);

    if (error) {
      toast.error('Failed to create user', { description: error });
      return;
    }

    if (data?.success) {
      setNewUserData({ email: '', name: '', password: '', role: 'user' });
      setIsCreateUserDialogOpen(false);
      await loadUsers();
      toast.success('User created successfully', { 
        description: 'A welcome email with credentials has been sent.' 
      });
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserData(prev => ({ ...prev, password }));
  };

  const handleRemoveUser = async (email: string) => {
    setRemovingUserEmail(email);
    const { error } = await removeUser(email);
    setRemovingUserEmail(null);

    if (error) {
      toast.error('Failed to remove user', { description: error });
      return;
    }

    setUsers(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));
    toast.success('User removed successfully');
  };

  const handleChangeEmail = async () => {
    if (!changeEmailData.oldEmail.trim() || !changeEmailData.newEmail.trim()) return;
    
    setIsChangingEmail(true);
    const { error } = await changeUserEmail(changeEmailData.oldEmail.trim(), changeEmailData.newEmail.trim());
    setIsChangingEmail(false);

    if (error) {
      toast.error('Failed to change email', { description: error });
      return;
    }

    setChangeEmailData({ oldEmail: '', newEmail: '' });
    setIsChangeEmailDialogOpen(false);
    await Promise.all([loadUsers(), loadAdmins()]);
    toast.success('Email changed successfully', {
      description: 'All acknowledgements and data have been transferred to the new email.'
    });
  };

  const handleResetPassword = async (email: string) => {
    setResettingPasswordEmail(email);
    const { error } = await forcePasswordReset(email);
    setResettingPasswordEmail(null);

    if (error) {
      toast.error('Failed to reset password flag', { description: error });
      return;
    }

    toast.success('Password reset required', {
      description: 'User will be prompted to change their password on next login.'
    });
  };

  // HR can only see updates list and delete, not admin/user management
  if (!isAdmin && !isHR) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  const handleDeleteUpdate = async (updateId: string) => {
    setDeletingUpdateId(updateId);
    const result = await deleteUpdate(updateId);
    setDeletingUpdateId(null);
    
    if (result.error) {
      toast.error('Failed to delete update', { description: result.error });
      return;
    }
    
    toast.success('Update deleted successfully');
    refreshData();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshData(), loadAdmins(), loadUsers(), loadQuestions()]);
    setIsRefreshing(false);
  };

  const handleCreateUpdate = async () => {
    setIsCreatingUpdate(true);
    try {
      const updateData = {
        ...newUpdate,
        category: newUpdate.category || null,
      };
      await createUpdate(updateData);
      setNewUpdate({
        title: '',
        summary: '',
        body: '',
        help_center_url: '',
        posted_by: user?.email || '',
        deadline_at: getDefaultDeadline(),
        status: 'draft',
        category: '',
      });
      setIsCreateDialogOpen(false);
    } finally {
      setIsCreatingUpdate(false);
    }
  };

  const handleEditUpdate = async (updateId: string, update: Partial<Omit<Update, 'id' | 'posted_at'>>) => {
    await editUpdate(updateId, update, user?.email);
    setEditingUpdate(null);
  };

  const handleBulkImport = async () => {
    if (!bulkEmails.trim()) return;
    
    setIsBulkImporting(true);
    const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e);
    
    const { data, error } = await bulkAddUsers(emails);
    setIsBulkImporting(false);
    
    if (error) {
      toast.error('Bulk import failed');
      return;
    }
    
    if (data) {
      await loadUsers();
      setBulkEmails('');
      
      if (data.failed.length > 0) {
        toast.warning(`Added ${data.added} users. ${data.failed.length} failed (may already exist).`);
      } else {
        toast.success(`Successfully added ${data.added} users`);
      }
    }
  };

  const exportAcknowledgements = (update: Update) => {
    const acks = getAcknowledgementsForUpdate(update.id);
    
    const rows = acks.map(ack => ({
      email: ack.agent_email,
      acknowledged: 'Yes',
      acknowledged_at: format(new Date(ack.acknowledged_at), 'yyyy-MM-dd HH:mm'),
    }));

    const csv = [
      ['Email', 'Acknowledged', 'Acknowledged At'],
      ...rows.map(r => [r.email, r.acknowledged, r.acknowledged_at]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acknowledgements-${update.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage updates and track team acknowledgements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Update
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Update</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Article Title</Label>
                    <Input
                      id="title"
                      value={newUpdate.title}
                      onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Revalida - Dec 29-Jan 4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary">Article Status</Label>
                    <Select
                      value={newUpdate.summary}
                      onValueChange={(value) => setNewUpdate(prev => ({ ...prev, summary: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select article status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Created New Article">Created New Article</SelectItem>
                        <SelectItem value="Updated Existing Article">Updated Existing Article</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="body">Body</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSimilarModal(true)}
                        disabled={!newUpdate.title && !newUpdate.summary && !newUpdate.body}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-300"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Check for Similar Updates
                      </Button>
                    </div>
                    <MarkdownEditor
                      value={newUpdate.body}
                      onChange={(value) => setNewUpdate(prev => ({ ...prev, body: value }))}
                      placeholder="Paste your update here, then click 'AI Format' to make it look nice. After that, click 'Preview' to see how it will look."
                      minHeight={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="help_center_url">URL (add if applicable)</Label>
                    <Input
                      id="help_center_url"
                      value={newUpdate.help_center_url}
                      onChange={(e) => setNewUpdate(prev => ({ ...prev, help_center_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="posted_by">Posted By</Label>
                      <Select
                        value={newUpdate.posted_by}
                        onValueChange={(value) => setNewUpdate(prev => ({ ...prev, posted_by: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select admin" />
                        </SelectTrigger>
                        <SelectContent>
                          {admins.map(admin => (
                            <SelectItem key={admin.id} value={admin.email}>
                              <div className="flex flex-col">
                                <span>{getNameByEmail(admin.email)}</span>
                                <span className="text-xs text-muted-foreground">{admin.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline_at">Posted Date</Label>
                      <Input
                        id="deadline_at"
                        type="datetime-local"
                        value={newUpdate.deadline_at}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, deadline_at: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Default: 24h from now (NY EST)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                      <Select
                        value={newUpdate.category}
                        onValueChange={(value: UpdateCategory) => setNewUpdate(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newUpdate.status}
                        onValueChange={(value: Update['status']) => setNewUpdate(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCreateUpdate} className="w-full" disabled={isCreatingUpdate || !newUpdate.title || !newUpdate.summary || !newUpdate.body || !newUpdate.posted_by || !newUpdate.deadline_at || !newUpdate.category}>
                    {isCreatingUpdate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Update'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{updates.length}</p>
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
                  <p className="text-2xl font-bold">{updates.filter(u => u.status === 'published').length}</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Circle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{updates.filter(u => u.status === 'draft').length}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management - Only visible to admins, not HR */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Admin Management</CardTitle>
            </div>
            <CardDescription>Add or remove administrators who can manage updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
              />
              <Button onClick={handleAddAdmin} disabled={isAddingAdmin || !newAdminEmail.trim()}>
                {isAddingAdmin ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </>
                )}
              </Button>
            </div>
            <div className="border rounded-lg divide-y">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{getNameByEmail(admin.email)}</p>
                      <p className="text-xs text-muted-foreground">
                        {admin.email} • Added {format(new Date(admin.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveAdmin(admin.email)}
                    disabled={removingAdminEmail === admin.email || user?.email?.toLowerCase() === admin.email.toLowerCase()}
                  >
                    {removingAdminEmail === admin.email ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
              {admins.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  No admins configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* User Management - Only visible to admins, not HR */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>Add or remove users who can log in to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Single user add */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
              />
              <Button onClick={handleAddUser} disabled={isAddingUser || !newUserEmail.trim()}>
                {isAddingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </>
                )}
              </Button>
            </div>
            
            {/* Bulk import */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Bulk Import Users</span>
              </div>
              <Textarea
                placeholder="Enter multiple email addresses (one per line, or separated by commas)"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={3}
                className="bg-background"
              />
              <Button 
                onClick={handleBulkImport} 
                disabled={isBulkImporting || !bulkEmails.trim()}
                variant="secondary"
                className="w-full"
              >
                {isBulkImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Import Users
                  </>
                )}
              </Button>
            </div>

            {/* Create User with Password */}
            <div className="border rounded-lg p-4 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Create User with Password</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsCreateUserDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a user with a temporary password. They will receive an email with credentials and be required to change their password on first login.
              </p>
            </div>
            {/* Change Email */}
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Change User Email</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsChangeEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Change Email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Change a user's email address. All acknowledgements and data will be transferred to the new email.
              </p>
            </div>

            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {users.map((userItem) => (
                <div key={userItem.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{getNameByEmail(userItem.email)}</p>
                      <p className="text-xs text-muted-foreground">
                        {userItem.email} • Added {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Force password reset"
                      onClick={() => handleResetPassword(userItem.email)}
                      disabled={resettingPasswordEmail === userItem.email}
                    >
                      {resettingPasswordEmail === userItem.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveUser(userItem.email)}
                      disabled={removingUserEmail === userItem.email}
                    >
                      {removingUserEmail === userItem.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  No users configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Edit Update Dialog */}
        <EditUpdateDialog
          update={editingUpdate}
          open={!!editingUpdate}
          onOpenChange={(open) => !open && setEditingUpdate(null)}
          onSave={handleEditUpdate}
          admins={admins}
        />

        {/* Create User with Password Dialog */}
        <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create User with Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-user-name">Full Name</Label>
                <Input
                  id="create-user-name"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-email">Email</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-password">Temporary Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="create-user-password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomPassword}
                    title="Generate random password"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {newUserData.password && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(newUserData.password);
                        toast.success('Password copied to clipboard');
                      }}
                      title="Copy password"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-user-role">Role</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value: 'admin' | 'user' | 'hr') => setNewUserData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 border rounded-lg p-3 text-sm text-muted-foreground">
                <p>The user will receive an email with their login credentials and will be required to change their password on first login.</p>
              </div>
              <Button 
                onClick={handleCreateUserWithPassword} 
                className="w-full" 
                disabled={!newUserData.email || !newUserData.password || !newUserData.name || isCreatingUser}
              >
                {isCreatingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Email Dialog */}
        <Dialog open={isChangeEmailDialogOpen} onOpenChange={setIsChangeEmailDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change User Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="old-email">Current Email</Label>
                <Input
                  id="old-email"
                  type="email"
                  value={changeEmailData.oldEmail}
                  onChange={(e) => setChangeEmailData(prev => ({ ...prev, oldEmail: e.target.value }))}
                  placeholder="current@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={changeEmailData.newEmail}
                  onChange={(e) => setChangeEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                  placeholder="new@example.com"
                />
              </div>
              <div className="bg-muted/50 border rounded-lg p-3 text-sm text-muted-foreground">
                <p>This will update the email and transfer all acknowledgements, questions, leave requests, and profile data to the new email.</p>
              </div>
              <Button 
                onClick={handleChangeEmail} 
                className="w-full" 
                disabled={!changeEmailData.oldEmail || !changeEmailData.newEmail || isChangingEmail}
              >
                {isChangingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing Email...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Change Email
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Updates</CardTitle>
                <CardDescription>Click on an update to view acknowledgement details</CardDescription>
              </div>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                  <TabsTrigger value="obsolete">Obsolete</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {updates
                .filter(u => statusFilter === 'all' || u.status === statusFilter)
                .map(update => {
                  const ackCount = getAcknowledgementCount(update.id);
                  const completionPercent = totalUsers > 0 
                    ? Math.round((ackCount / totalUsers) * 100)
                    : 0;
                  
                  return (
                    <TableRow key={update.id}>
                      <TableCell className="font-medium max-w-xs truncate">{update.title}</TableCell>
                      <TableCell>
                        <Badge variant={update.status === 'published' ? 'default' : 'secondary'}>
                          {update.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(update.posted_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={completionPercent} className="w-20 h-1.5" />
                          <span className="text-xs text-muted-foreground">
                            {ackCount}/{totalUsers}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* HR users can only delete */}
                          {isHR && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUpdate(update.id)}
                              disabled={deletingUpdateId === update.id}
                            >
                              {deletingUpdateId === update.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {/* Admin users get full controls */}
                          {isAdmin && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingUpdate(update)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>{update.title}</DialogTitle>
                                  </DialogHeader>
                                  <Tabs defaultValue="acknowledged" className="mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <TabsList>
                                        <TabsTrigger value="acknowledged">
                                          Acknowledged ({ackCount})
                                        </TabsTrigger>
                                      </TabsList>
                                      <Button variant="outline" size="sm" onClick={() => exportAcknowledgements(update)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export CSV
                                      </Button>
                                    </div>
                                    <TabsContent value="acknowledged">
                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {getAcknowledgementsForUpdate(update.id).map(ack => (
                                          <div key={ack.agent_email} className="flex items-center gap-3 p-2 rounded bg-success/5">
                                            <CheckCircle2 className="h-4 w-4 text-success" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium">{getNameByEmail(ack.agent_email)}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {format(new Date(ack.acknowledged_at), 'MMM d, yyyy at h:mm a')}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                        {getAcknowledgementsForUpdate(update.id).length === 0 && (
                                          <p className="text-muted-foreground text-center py-4">No acknowledgements yet</p>
                                        )}
                                      </div>
                                    </TabsContent>
                                  </Tabs>
                                </DialogContent>
                              </Dialog>
                              <Select
                                value={update.status}
                                onValueChange={(value: Update['status']) => updateUpdateStatus(update.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="published">Published</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                  <SelectItem value="obsolete">Obsolete</SelectItem>
                                </SelectContent>
                              </Select>
                              {user?.email?.toLowerCase() === 'hr@virtualfreelancesolutions.com' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteUpdate(update.id)}
                                  disabled={deletingUpdateId === update.id}
                                >
                                  {deletingUpdateId === update.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Similar Updates Modal */}
        <SimilarUpdatesModal
          open={showSimilarModal}
          onOpenChange={setShowSimilarModal}
          title={newUpdate.title}
          summary={newUpdate.summary}
          body={newUpdate.body}
          onEditExisting={(updateId) => {
            const update = updates.find(u => u.id === updateId);
            if (update) {
              setEditingUpdate(update);
              setIsCreateDialogOpen(false);
            }
          }}
        />
      </div>
    </Layout>
  );
}
