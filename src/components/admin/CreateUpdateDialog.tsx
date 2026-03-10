import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUpdates } from '@/context/UpdatesContext';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { SimilarUpdatesModal } from '@/components/SimilarUpdatesModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { getDefaultDeadline } from '@/lib/dateUtils';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { CATEGORIES, UpdateCategory } from '@/lib/categories';
import { fetchAdmins, AdminRole } from '@/lib/api';
import { Update } from '@/types';


interface CreateUpdateDialogProps {
  onUpdateCreated?: () => void;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CreateUpdateDialog({ 
  onUpdateCreated, 
  buttonVariant = 'default',
  buttonSize = 'default'
}: CreateUpdateDialogProps) {
  const { user } = useAuth();
  const { createUpdate } = useUpdates();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [admins, setAdmins] = useState<AdminRole[]>([]);
  
  
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

  // Load admins when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAdmins();
    }
  }, [isOpen]);

  // Auto-populate Posted By when user changes
  useEffect(() => {
    if (user?.email) {
      setNewUpdate(prev => ({ ...prev, posted_by: user.email }));
    }
  }, [user?.email]);

  const loadAdmins = async () => {
    const { data } = await fetchAdmins();
    if (data) {
      setAdmins(data);
    }
  };

  const getNameByEmail = (email: string) => {
    return getKnownNameByEmail(email) || email;
  };

  const handleCreate = async () => {
    setIsCreating(true);
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
      
      setIsOpen(false);
      onUpdateCreated?.();
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = newUpdate.title && newUpdate.summary && newUpdate.body && newUpdate.posted_by && newUpdate.deadline_at && newUpdate.category;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} size={buttonSize}>
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
                  className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-300 dark:border-red-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Check for Similar Updates
                </Button>
              </div>
              <MarkdownEditor
                value={newUpdate.body}
                onChange={(value) => setNewUpdate(prev => ({ ...prev, body: value }))}
                onExtractText={(text) => setNewUpdate(prev => ({ ...prev, body: prev.body ? prev.body + '\n\n' + text : text }))}
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
            <Button onClick={handleCreate} className="w-full" disabled={isCreating || !isFormValid}>
              {isCreating ? (
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

      <SimilarUpdatesModal
        open={showSimilarModal}
        onOpenChange={setShowSimilarModal}
        title={newUpdate.title}
        summary={newUpdate.summary}
        body={newUpdate.body}
      />
    </>
  );
}
