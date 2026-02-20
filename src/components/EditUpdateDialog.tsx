import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Update } from '@/types';
import { AdminRole } from '@/lib/api';
import { getKnownNameByEmail } from '@/lib/nameDirectory';
import { Loader2 } from 'lucide-react';
import { CATEGORIES, UpdateCategory } from '@/lib/categories';


interface EditUpdateDialogProps {
  update: Update | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updateId: string, update: Partial<Omit<Update, 'id' | 'posted_at'>>) => Promise<void>;
  admins: AdminRole[];
}

export function EditUpdateDialog({ update, open, onOpenChange, onSave, admins }: EditUpdateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    body: '',
    help_center_url: '',
    posted_by: '',
    deadline_at: '',
    status: 'draft' as Update['status'],
    category: '' as UpdateCategory | '',
  });

  useEffect(() => {
    if (update) {
      setFormData({
        title: update.title,
        summary: update.summary,
        body: update.body,
        help_center_url: update.help_center_url || '',
        posted_by: update.posted_by,
        deadline_at: update.deadline_at || '',
        status: update.status,
        category: update.category || '',
      });
    }
  }, [update]);

  const handleSave = async () => {
    if (!update) return;
    
    setIsLoading(true);
    try {
      const dataToSave = {
        ...formData,
        category: formData.category || null,
      };
      await onSave(update.id, dataToSave);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = formData.title && formData.summary && formData.body && formData.posted_by && formData.deadline_at && formData.category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Article Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Revalida - Dec 29-Jan 4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-summary">Article Status</Label>
            <Select
              value={formData.summary}
              onValueChange={(value) => setFormData(prev => ({ ...prev, summary: value }))}
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
            <Label htmlFor="edit-body">Body</Label>
            <MarkdownEditor
              value={formData.body}
              onChange={(value) => setFormData(prev => ({ ...prev, body: value }))}
              placeholder="Write your article content here..."
              minHeight={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-help_center_url">Help Center URL</Label>
            <Input
              id="edit-help_center_url"
              value={formData.help_center_url}
              onChange={(e) => setFormData(prev => ({ ...prev, help_center_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-posted_by">Posted By</Label>
              <Select
                value={formData.posted_by}
                onValueChange={(value) => setFormData(prev => ({ ...prev, posted_by: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map(admin => {
                    const name = getKnownNameByEmail(admin.email) || admin.email;
                    return (
                      <SelectItem key={admin.id} value={admin.email} textValue={name}>
                        <div className="flex flex-col">
                          <span>{name}</span>
                          <span className="text-xs text-muted-foreground">{admin.email}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-deadline_at">Posted Date</Label>
              <Input
                id="edit-deadline_at"
                type="datetime-local"
                value={formData.deadline_at}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline_at: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category <span className="text-destructive">*</span></Label>
              <Select
                value={formData.category}
                onValueChange={(value: UpdateCategory) => setFormData(prev => ({ ...prev, category: value }))}
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
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Update['status']) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="obsolete">Obsolete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
