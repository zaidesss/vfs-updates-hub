import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  History, 
  Pencil, 
  Trash2, 
  Loader2,
  Tag,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

interface ChangelogEntry {
  id: string;
  reference_number: string;
  title: string;
  description: string;
  category: string;
  feature_link: string | null;
  visible_to_roles: string[];
  created_by: string;
  created_at: string;
}

const CATEGORIES = [
  'Profile',
  'Updates',
  'Leave',
  'Admin',
  'Notifications',
  'Security',
  'Calendar',
  'Knowledge Base',
  'Requests',
  'Other',
];

const ROLES = [
  { id: 'user', label: 'User' },
  { id: 'hr', label: 'HR' },
  { id: 'admin', label: 'Admin' },
  { id: 'super_admin', label: 'Super Admin' },
];

interface ChangelogManagementProps {
  currentUserEmail: string;
}

export function ChangelogManagement({ currentUserEmail }: ChangelogManagementProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<ChangelogEntry | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    feature_link: '',
    visible_to_roles: ['user', 'hr', 'admin', 'super_admin'] as string[],
  });

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('portal_changelog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading changelog:', error);
      toast.error('Failed to load changelog entries');
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      feature_link: '',
      visible_to_roles: ['user', 'hr', 'admin', 'super_admin'],
    });
    setEditingEntry(null);
  };

  const handleOpenDialog = (entry?: ChangelogEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        title: entry.title,
        description: entry.description,
        category: entry.category,
        feature_link: entry.feature_link || '',
        visible_to_roles: entry.visible_to_roles,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.visible_to_roles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    setIsSaving(true);

    const dataToSave = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      feature_link: formData.feature_link.trim() || null,
      visible_to_roles: formData.visible_to_roles,
      created_by: currentUserEmail,
    };

    if (editingEntry) {
      const { error } = await supabase
        .from('portal_changelog')
        .update(dataToSave)
        .eq('id', editingEntry.id);

      if (error) {
        toast.error('Failed to update entry', { description: error.message });
      } else {
        toast.success('Changelog entry updated');
        await loadEntries();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('portal_changelog')
        .insert([dataToSave]);

      if (error) {
        toast.error('Failed to create entry', { description: error.message });
      } else {
        toast.success('Changelog entry created');
        await loadEntries();
        setIsDialogOpen(false);
        resetForm();
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;

    const { error } = await supabase
      .from('portal_changelog')
      .delete()
      .eq('id', entryToDelete.id);

    if (error) {
      toast.error('Failed to delete entry', { description: error.message });
    } else {
      toast.success('Changelog entry deleted');
      await loadEntries();
    }

    setDeleteModalOpen(false);
    setEntryToDelete(null);
  };

  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      visible_to_roles: prev.visible_to_roles.includes(roleId)
        ? prev.visible_to_roles.filter(r => r !== roleId)
        : [...prev.visible_to_roles, roleId],
    }));
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map(role => {
      const roleLabel = ROLES.find(r => r.id === role)?.label || role;
      return (
        <Badge key={role} variant="secondary" className="text-xs">
          {roleLabel}
        </Badge>
      );
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Changelog Management</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? 'Edit Changelog Entry' : 'Create Changelog Entry'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., New Profile Change Request Feature"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the change or new feature..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feature_link">Feature Link (optional)</Label>
                  <Input
                    id="feature_link"
                    value={formData.feature_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, feature_link: e.target.value }))}
                    placeholder="/profile or /admin"
                  />
                  <p className="text-xs text-muted-foreground">
                    Path to the feature (e.g., /profile, /leave-request)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Visible To <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(role => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={formData.visible_to_roles.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {role.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only selected roles will see this changelog entry
                  </p>
                </div>

                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={isSaving || !formData.title.trim() || !formData.description.trim() || !formData.category || formData.visible_to_roles.length === 0}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingEntry ? 'Update Entry' : 'Create Entry'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Add, edit, or remove changelog entries. Users will only see entries relevant to their role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No changelog entries yet.</p>
            <p className="text-sm">Click "Add Entry" to create the first one.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ref</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-28">Category</TableHead>
                  <TableHead className="w-48">Visible To</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      {entry.reference_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.title}</span>
                        {entry.feature_link && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getRoleBadges(entry.visible_to_roles)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setEntryToDelete(entry);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setEntryToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Changelog Entry"
        description={`Are you sure you want to delete this changelog entry? This action cannot be undone.`}
        itemName={entryToDelete?.title}
      />
    </Card>
  );
}
