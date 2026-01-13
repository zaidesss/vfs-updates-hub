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
  RotateCcw,
  History,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { Update, UpdateQuestion } from '@/types';
import { fetchAdmins, addAdmin, removeAdmin, fetchUsers, addUser, removeUser, bulkAddUsers, AdminRole, createUserWithPassword, changeUserEmail, forcePasswordReset, changeUserRole, isProtectedAccount, fetchDeletedUsers, restoreUser, DeletedUser } from '@/lib/api';
import { deleteUpdate } from '@/lib/requestApi';
import { toast } from 'sonner';
import { getDefaultDeadline } from '@/lib/dateUtils';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { EditUpdateDialog } from '@/components/EditUpdateDialog';
import { SimilarUpdatesModal } from '@/components/SimilarUpdatesModal';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { CATEGORIES, UpdateCategory } from '@/lib/categories';
import { supabase } from '@/integrations/supabase/client';
import { ChangelogManagement } from '@/components/admin/ChangelogManagement';

export default function Admin() {
  const { isAdmin, isHR, isSuperAdmin, user } = useAuth();
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
  const [bulkImportRole, setBulkImportRole] = useState<'user' | 'hr' | 'admin' | 'super_admin'>('user');
  const [bulkPasswordType, setBulkPasswordType] = useState<'single' | 'generated'>('generated');
  const [bulkSinglePassword, setBulkSinglePassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkPreviewData, setBulkPreviewData] = useState<{ email: string; password: string }[]>([]);
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
  const [changingRoleEmail, setChangingRoleEmail] = useState<string | null>(null);
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ email: string; name: string } | null>(null);
  const [deleteUpdateModalOpen, setDeleteUpdateModalOpen] = useState(false);
  const [updateToDelete, setUpdateToDelete] = useState<Update | null>(null);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [userToRestore, setUserToRestore] = useState<DeletedUser | null>(null);
  const [isRestoringUser, setIsRestoringUser] = useState(false);
  const [restoreUserData, setRestoreUserData] = useState({
    password: '',
    role: 'user' as 'super_admin' | 'admin' | 'user' | 'hr',
  });
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'super_admin' | 'admin' | 'user' | 'hr',
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
    if (isSuperAdmin) {
      loadDeletedUsers();
    }
  }, [isSuperAdmin]);

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

  const loadDeletedUsers = async () => {
    const { data } = await fetchDeletedUsers();
    if (data) {
      setDeletedUsers(data);
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
          status: (q.status as 'pending' | 'on_going' | 'answered' | 'closed') || 'pending',
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
    const { error } = await removeUser(email, user?.email);
    setRemovingUserEmail(null);

    if (error) {
      toast.error('Failed to remove user', { description: error });
      return;
    }

    setUsers(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));
    await loadDeletedUsers(); // Refresh deleted users list
    toast.success('User deleted successfully', { 
      description: 'All user data has been permanently removed. You can restore this user from Deleted Users.' 
    });
  };

  const openDeleteUserModal = (email: string, name: string) => {
    // Block deletion of protected account
    if (isProtectedAccount(email)) {
      toast.error('This account is protected', { description: 'This account cannot be deleted.' });
      return;
    }
    setUserToDelete({ email, name });
    setDeleteUserModalOpen(true);
  };

  const openDeleteUpdateModal = (update: Update) => {
    setUpdateToDelete(update);
    setDeleteUpdateModalOpen(true);
  };

  const openRestoreDialog = (deletedUser: DeletedUser) => {
    setUserToRestore(deletedUser);
    setRestoreUserData({
      password: '',
      role: deletedUser.original_role as 'super_admin' | 'admin' | 'user' | 'hr',
    });
    setIsRestoreDialogOpen(true);
  };

  const handleRestoreUser = async () => {
    if (!userToRestore || !restoreUserData.password) return;

    setIsRestoringUser(true);
    const { error } = await restoreUser(
      userToRestore.id,
      userToRestore.email,
      userToRestore.name || userToRestore.email.split('@')[0],
      restoreUserData.password,
      restoreUserData.role
    );
    setIsRestoringUser(false);

    if (error) {
      toast.error('Failed to restore user', { description: error });
      return;
    }

    setIsRestoreDialogOpen(false);
    setUserToRestore(null);
    await Promise.all([loadUsers(), loadDeletedUsers()]);
    toast.success('User restored successfully', { 
      description: 'The user can now log in with the new password.' 
    });
  };

  const generateRestorePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRestoreUserData(prev => ({ ...prev, password }));
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

  const handleChangeRole = async (email: string, newRole: 'super_admin' | 'admin' | 'user' | 'hr') => {
    // Prevent self-demotion from super_admin
    if (user?.email?.toLowerCase() === email.toLowerCase() && isSuperAdmin && newRole !== 'super_admin') {
      toast.error('Cannot demote yourself', { description: 'Ask another super admin to change your role.' });
      return;
    }

    setChangingRoleEmail(email);
    const { error } = await changeUserRole(email, newRole);
    setChangingRoleEmail(null);

    if (error) {
      toast.error('Failed to change role', { description: error });
      return;
    }

    await loadUsers();
    toast.success('Role updated successfully');
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
    
    toast.success('Update deleted permanently');
    setUpdateToDelete(null);
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

  const generateBulkPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleBulkPreview = () => {
    if (!bulkEmails.trim()) return;
    
    const emails = bulkEmails.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e && e.includes('@'));
    
    if (emails.length === 0) {
      toast.error('No valid email addresses found');
      return;
    }

    // Check for duplicates
    const uniqueEmails = [...new Set(emails)];
    if (uniqueEmails.length !== emails.length) {
      toast.warning(`Removed ${emails.length - uniqueEmails.length} duplicate emails`);
    }

    // Generate preview data with passwords
    const previewData = uniqueEmails.map(email => ({
      email,
      password: bulkPasswordType === 'single' ? bulkSinglePassword : generateBulkPassword(),
    }));

    setBulkPreviewData(previewData);
    setShowBulkPreview(true);
  };

  const handleBulkImport = async () => {
    if (bulkPreviewData.length === 0) return;
    
    setIsBulkImporting(true);
    
    let added = 0;
    const failed: string[] = [];
    
    for (const userData of bulkPreviewData) {
      const { error } = await createUserWithPassword(
        userData.email,
        userData.password,
        userData.email.split('@')[0], // Use email prefix as name
        bulkImportRole,
        requirePasswordChange
      );
      
      if (error) {
        failed.push(userData.email);
      } else {
        added++;
      }
    }
    
    setIsBulkImporting(false);
    
    await loadUsers();
    setBulkEmails('');
    setBulkPreviewData([]);
    setShowBulkPreview(false);
    setBulkSinglePassword('');
    
    if (failed.length > 0) {
      toast.warning(`Added ${added} users. ${failed.length} failed (may already exist).`, {
        description: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : ''),
      });
    } else {
      toast.success(`Successfully added ${added} users with ${bulkImportRole.replace('_', ' ')} role`);
    }
  };

  const cancelBulkPreview = () => {
    setShowBulkPreview(false);
    setBulkPreviewData([]);
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

        {/* User Management - Only visible to admins, not HR */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage all users, admins, and roles</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeEmailDialogOpen(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Change Email
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsCreateUserDialogOpen(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Create with Password
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users">All Users ({users.length})</TabsTrigger>
                <TabsTrigger value="add">Quick Add</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
              </TabsList>
              
              {/* All Users Tab */}
              <TabsContent value="users" className="mt-4">
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {users.map((userItem) => {
                    const isProtected = isProtectedAccount(userItem.email);
                    const roleColors: Record<string, string> = {
                      super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                      admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                      hr: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                      user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    };
                    return (
                      <div key={userItem.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            userItem.role === 'super_admin' || userItem.role === 'admin' 
                              ? 'bg-primary/10' 
                              : userItem.role === 'hr' 
                                ? 'bg-green-100 dark:bg-green-900' 
                                : 'bg-muted'
                          }`}>
                            {userItem.role === 'super_admin' || userItem.role === 'admin' ? (
                              <Shield className="h-4 w-4 text-primary" />
                            ) : userItem.role === 'hr' ? (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{getNameByEmail(userItem.email)}</p>
                              <Badge className={`text-xs ${roleColors[userItem.role] || roleColors.user}`}>
                                {userItem.role === 'super_admin' ? 'Super Admin' : userItem.role.toUpperCase()}
                              </Badge>
                              {isProtected && (
                                <Badge variant="outline" className="text-xs">Protected</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {userItem.email} • Added {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Role dropdown - only for super admins */}
                          {isSuperAdmin && !isProtected && (
                            <Select
                              value={userItem.role}
                              onValueChange={(value: 'super_admin' | 'admin' | 'user' | 'hr') => handleChangeRole(userItem.email, value)}
                              disabled={changingRoleEmail === userItem.email}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                {changingRoleEmail === userItem.email ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="hr">HR</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(userItem.email)}
                            disabled={resettingPasswordEmail === userItem.email}
                            title="Reset password"
                          >
                            {resettingPasswordEmail === userItem.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                          {!isProtected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteUserModal(userItem.email, getNameByEmail(userItem.email))}
                              disabled={removingUserEmail === userItem.email || (userItem.role === 'super_admin' && !isSuperAdmin)}
                              title="Delete user permanently"
                            >
                              {removingUserEmail === userItem.email ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {users.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      No users configured
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Quick Add Tab */}
              <TabsContent value="add" className="mt-4 space-y-4">
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
                <p className="text-sm text-muted-foreground">
                  Quick add creates a user account. They will receive a welcome email to set their password.
                </p>
              </TabsContent>
              
              {/* Bulk Import Tab */}
              <TabsContent value="bulk" className="mt-4 space-y-4">
                {!showBulkPreview ? (
                  <div className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-2">
                      <Label>Email Addresses</Label>
                      <Textarea
                        placeholder="Enter multiple email addresses (one per line, or separated by commas)"
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        rows={4}
                        className="bg-background"
                      />
                    </div>

                    {/* Role Selection - Only super admin can assign admin roles */}
                    <div className="space-y-2">
                      <Label>Role for All Users</Label>
                      <Select
                        value={bulkImportRole}
                        onValueChange={(value: 'user' | 'hr' | 'admin' | 'super_admin') => setBulkImportRole(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          {isSuperAdmin && (
                            <>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Password Options */}
                    <div className="space-y-2">
                      <Label>Password Option</Label>
                      <Select
                        value={bulkPasswordType}
                        onValueChange={(value: 'single' | 'generated') => setBulkPasswordType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generated">Auto-generate unique password per user</SelectItem>
                          <SelectItem value="single">Same password for all users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Single Password Input */}
                    {bulkPasswordType === 'single' && (
                      <div className="space-y-2">
                        <Label>Temporary Password</Label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={bulkSinglePassword}
                            onChange={(e) => setBulkSinglePassword(e.target.value)}
                            placeholder="Enter password for all users"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkSinglePassword(generateBulkPassword())}
                          >
                            Generate
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Require Password Change */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requirePasswordChange"
                        checked={requirePasswordChange}
                        onChange={(e) => setRequirePasswordChange(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <Label htmlFor="requirePasswordChange" className="text-sm font-normal cursor-pointer">
                        Require password change on first login
                      </Label>
                    </div>

                    <Button 
                      onClick={handleBulkPreview} 
                      disabled={!bulkEmails.trim() || (bulkPasswordType === 'single' && !bulkSinglePassword.trim())}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Import
                    </Button>
                  </div>
                ) : (
                  /* Preview Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Preview Import</h4>
                        <p className="text-sm text-muted-foreground">
                          {bulkPreviewData.length} users will be created as{' '}
                          <Badge variant="outline" className="ml-1">
                            {bulkImportRole === 'super_admin' ? 'Super Admin' : bulkImportRole.toUpperCase()}
                          </Badge>
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={cancelBulkPreview}>
                        Back to Edit
                      </Button>
                    </div>

                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Temporary Password</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkPreviewData.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{item.email}</TableCell>
                              <TableCell>
                                <code className="bg-muted px-2 py-1 rounded text-sm">{item.password}</code>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {requirePasswordChange && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        ⚠️ Users will be required to change their password on first login.
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleBulkImport} 
                        disabled={isBulkImporting}
                        className="flex-1"
                      >
                        {isBulkImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing {bulkPreviewData.length} users...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Confirm Import
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}

        {/* Changelog Management - Super Admin Only */}
        {isSuperAdmin && (
          <ChangelogManagement currentUserEmail={user?.email || ''} />
        )}

        {/* Deleted Users Section - Super Admin Only */}
        {isSuperAdmin && deletedUsers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Deleted Users</CardTitle>
                  <CardDescription>Users that have been deleted and can be restored</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {deletedUsers.map((deletedUser) => (
                  <div key={deletedUser.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{deletedUser.name || deletedUser.email}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {deletedUser.original_role === 'super_admin' ? 'Super Admin' : deletedUser.original_role.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {deletedUser.email} • Deleted {format(new Date(deletedUser.deleted_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRestoreDialog(deletedUser)}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                ))}
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
                  onValueChange={(value: 'super_admin' | 'admin' | 'user' | 'hr') => setNewUserData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
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

        {/* Restore User Dialog */}
        <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Restore User</DialogTitle>
            </DialogHeader>
            {userToRestore && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 border rounded-lg p-3">
                  <p className="text-sm font-medium">{userToRestore.name || userToRestore.email}</p>
                  <p className="text-xs text-muted-foreground">{userToRestore.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Original role: {userToRestore.original_role === 'super_admin' ? 'Super Admin' : userToRestore.original_role.toUpperCase()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restore-password">New Password</Label>
                  <div className="flex gap-2">
                    <Input
                      id="restore-password"
                      value={restoreUserData.password}
                      onChange={(e) => setRestoreUserData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateRestorePassword}
                      title="Generate random password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {restoreUserData.password && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(restoreUserData.password);
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
                  <Label htmlFor="restore-role">Role</Label>
                  <Select
                    value={restoreUserData.role}
                    onValueChange={(value: 'super_admin' | 'admin' | 'user' | 'hr') => setRestoreUserData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleRestoreUser} 
                  className="w-full" 
                  disabled={!restoreUserData.password || isRestoringUser}
                >
                  {isRestoringUser ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Restore User
                    </>
                  )}
                </Button>
              </div>
            )}
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
                              onClick={() => openDeleteUpdateModal(update)}
                              disabled={deletingUpdateId === update.id}
                              title="Delete update permanently"
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
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => openDeleteUpdateModal(update)}
                                  disabled={deletingUpdateId === update.id}
                                  title="Delete update permanently"
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

        {/* Delete User Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteUserModalOpen}
          onOpenChange={(open) => {
            setDeleteUserModalOpen(open);
            if (!open) setUserToDelete(null);
          }}
          onConfirm={async () => {
            if (userToDelete) {
              await handleRemoveUser(userToDelete.email);
            }
          }}
          title="Delete User Permanently"
          description="This action cannot be undone. This will permanently delete the user account and remove all their data including:"
          itemName={userToDelete ? `• Acknowledgements\n• Questions & replies\n• Leave requests\n• Profile data\n• Notifications\n\nUser: ${userToDelete.name} (${userToDelete.email})` : undefined}
        />

        {/* Delete Update Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteUpdateModalOpen}
          onOpenChange={(open) => {
            setDeleteUpdateModalOpen(open);
            if (!open) setUpdateToDelete(null);
          }}
          onConfirm={async () => {
            if (updateToDelete) {
              await handleDeleteUpdate(updateToDelete.id);
            }
          }}
          title="Delete Update Permanently"
          description="This action cannot be undone. This will permanently delete the update and all associated acknowledgements and questions."
          itemName={updateToDelete ? `"${updateToDelete.title}"` : undefined}
        />
      </div>
    </Layout>
  );
}
