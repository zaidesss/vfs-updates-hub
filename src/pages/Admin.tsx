import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { Update } from '@/types';
import { fetchAdmins, addAdmin, removeAdmin, fetchUsers, addUser, removeUser, AdminRole } from '@/lib/api';
import { toast } from 'sonner';

export default function Admin() {
  const { isAdmin, agents, refreshAgents, user } = useAuth();
  const { updates, getAcknowledgementCount, getAcknowledgementsForUpdate, createUpdate, updateUpdateStatus, refreshData, isLoading } = useUpdates();
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
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    summary: '',
    body: '',
    help_center_url: '',
    posted_by: '',
    deadline_at: '',
    status: 'draft' as Update['status'],
  });

  const activeAgents = agents.filter(a => a.active);

  // Load admins on mount
  useEffect(() => {
    loadAdmins();
    loadUsers();
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshData(), refreshAgents()]);
    setIsRefreshing(false);
  };

  const handleCreateUpdate = async () => {
    await createUpdate(newUpdate);
    setNewUpdate({
      title: '',
      summary: '',
      body: '',
      help_center_url: '',
      posted_by: '',
      deadline_at: '',
      status: 'draft',
    });
    setIsCreateDialogOpen(false);
  };

  const exportAcknowledgements = (update: Update) => {
    const acks = getAcknowledgementsForUpdate(update.id);
    
    const rows = activeAgents.map(agent => {
      const ack = acks.find(a => a.agent_email.toLowerCase() === agent.email.toLowerCase());
      return {
        name: agent.name,
        email: agent.email,
        client: agent.client_name,
        acknowledged: ack ? 'Yes' : 'No',
        acknowledged_at: ack ? format(new Date(ack.acknowledged_at), 'yyyy-MM-dd HH:mm') : '',
      };
    });

    const csv = [
      ['Name', 'Email', 'Client', 'Acknowledged', 'Acknowledged At'],
      ...rows.map(r => [r.name, r.email, r.client, r.acknowledged, r.acknowledged_at]),
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
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newUpdate.title}
                      onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Revalida - Dec 29-Jan 4"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary">Summary</Label>
                    <Input
                      id="summary"
                      value={newUpdate.summary}
                      onChange={(e) => setNewUpdate(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Brief description of the update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Body</Label>
                    <Textarea
                      id="body"
                      value={newUpdate.body}
                      onChange={(e) => setNewUpdate(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Full content of the update (supports markdown)"
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="help_center_url">Help Center URL</Label>
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
                          <SelectItem value="Patrick">Patrick</SelectItem>
                          <SelectItem value="Meryl Jean Iman">Meryl Jean Iman</SelectItem>
                          <SelectItem value="Malcom Joseph Vincent Salmero">Malcom Joseph Vincent Salmero</SelectItem>
                          <SelectItem value="Kristin Joann Argao">Kristin Joann Argao</SelectItem>
                          <SelectItem value="Juno Dianne Garciano">Juno Dianne Garciano</SelectItem>
                          <SelectItem value="Jaeran Sanchez">Jaeran Sanchez</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline_at">Deadline (optional)</Label>
                      <Input
                        id="deadline_at"
                        type="datetime-local"
                        value={newUpdate.deadline_at}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, deadline_at: e.target.value }))}
                      />
                    </div>
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
                  <Button onClick={handleCreateUpdate} className="w-full" disabled={!newUpdate.title || !newUpdate.summary || !newUpdate.body || !newUpdate.posted_by}>
                    Create Update
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
                  <p className="text-2xl font-bold">{activeAgents.length}</p>
                  <p className="text-xs text-muted-foreground">Active Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management */}
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
                      <p className="text-sm font-medium">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {format(new Date(admin.created_at), 'MMM d, yyyy')}
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

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>Add or remove users who can log in to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {users.map((userItem) => (
                <div key={userItem.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{userItem.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
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
              ))}
              {users.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">
                  No users configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Updates</CardTitle>
            <CardDescription>Click on an update to view acknowledgement details</CardDescription>
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
                {updates.map(update => {
                  const ackCount = getAcknowledgementCount(update.id);
                  const completionPercent = activeAgents.length > 0 
                    ? Math.round((ackCount / activeAgents.length) * 100)
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
                            {ackCount}/{activeAgents.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                              <Tabs defaultValue="pending" className="mt-4">
                                <div className="flex items-center justify-between mb-4">
                                  <TabsList>
                                    <TabsTrigger value="pending">
                                      Not Acknowledged ({activeAgents.length - ackCount})
                                    </TabsTrigger>
                                    <TabsTrigger value="acknowledged">
                                      Acknowledged ({ackCount})
                                    </TabsTrigger>
                                  </TabsList>
                                  <Button variant="outline" size="sm" onClick={() => exportAcknowledgements(update)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export CSV
                                  </Button>
                                </div>
                                <TabsContent value="pending">
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {activeAgents
                                      .filter(agent => !getAcknowledgementsForUpdate(update.id).some(
                                        a => a.agent_email.toLowerCase() === agent.email.toLowerCase()
                                      ))
                                      .map(agent => (
                                        <div key={agent.email} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                                          <Circle className="h-4 w-4 text-muted-foreground" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">{agent.name}</p>
                                            <p className="text-xs text-muted-foreground">{agent.email}</p>
                                          </div>
                                          <Badge variant="outline" className="text-xs">{agent.client_name}</Badge>
                                        </div>
                                      ))}
                                  </div>
                                </TabsContent>
                                <TabsContent value="acknowledged">
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {getAcknowledgementsForUpdate(update.id).map(ack => {
                                      const agent = activeAgents.find(a => a.email.toLowerCase() === ack.agent_email.toLowerCase());
                                      return (
                                        <div key={ack.agent_email} className="flex items-center gap-3 p-2 rounded bg-success/5">
                                          <CheckCircle2 className="h-4 w-4 text-success" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium">{agent?.name || ack.agent_email}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {format(new Date(ack.acknowledged_at), 'MMM d, yyyy at h:mm a')}
                                            </p>
                                          </div>
                                          <Badge variant="secondary" className="text-xs">{agent?.client_name}</Badge>
                                        </div>
                                      );
                                    })}
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
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
