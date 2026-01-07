import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  Calendar, 
  User, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Pause,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high";
type Status = "not_started" | "in_progress" | "on_hold" | "completed";

interface Improvement {
  id: string;
  category: string;
  task: string;
  description: string | null;
  assignee_email: string | null;
  assignee_name: string | null;
  due_date: string | null;
  priority: Priority;
  status: Status;
  notes: string | null;
  requested_by_email: string;
  requested_by_name: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface UserRole {
  email: string;
  name: string | null;
  role: string;
}

interface ImprovementsTrackerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  currentUserEmail: string;
  currentUserName: string;
}

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Circle },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
  high: { label: "High", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
};

const statusConfig = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600", icon: Circle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-700", icon: Pause },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

const defaultCategories = [
  "User Interface",
  "Backend/Database",
  "Features",
  "Bug Fixes",
  "Performance",
  "Documentation",
  "Security",
  "Other",
];

const ImprovementsTracker = ({ 
  isOpen, 
  onOpenChange, 
  isSuperAdmin, 
  currentUserEmail,
  currentUserName 
}: ImprovementsTrackerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: "",
    customCategory: "",
    task: "",
    description: "",
    assignee_email: "",
    due_date: "",
    priority: "medium" as Priority,
    status: "not_started" as Status,
    notes: "",
  });

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch improvements
      const { data: improvementsData, error: improvementsError } = await supabase
        .from("improvements")
        .select("*")
        .order("sort_order");

      if (improvementsError) throw improvementsError;
      setImprovements(improvementsData || []);

      // Fetch users for assignee dropdown
      const { data: usersData, error: usersError } = await supabase
        .from("user_roles")
        .select("email, name, role")
        .order("name");

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Expand all categories by default
      const categories = new Set((improvementsData || []).map(i => i.category));
      setExpandedCategories(categories);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch data";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      category: "",
      customCategory: "",
      task: "",
      description: "",
      assignee_email: "",
      due_date: "",
      priority: "medium",
      status: "not_started",
      notes: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const category = formData.category === "custom" ? formData.customCategory.trim() : formData.category;
    const task = formData.task.trim();

    if (!category || !task) {
      toast({
        title: "Missing fields",
        description: "Please fill in category and task name.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const assignee = users.find(u => u.email === formData.assignee_email);
      
      const payload = {
        category,
        task,
        description: formData.description || null,
        assignee_email: formData.assignee_email || null,
        assignee_name: assignee?.name || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        status: formData.status,
        notes: formData.notes || null,
        requested_by_email: currentUserEmail,
        requested_by_name: currentUserName,
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("improvements")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Improvement updated", description: "Changes saved successfully." });
      } else {
        // Create new
        const maxSortOrder = improvements.length > 0 
          ? Math.max(...improvements.map(i => i.sort_order)) + 1 
          : 0;

        const { error } = await supabase
          .from("improvements")
          .insert({ ...payload, sort_order: maxSortOrder });

        if (error) throw error;
        toast({ title: "Improvement added", description: "New improvement has been created." });
      }

      resetForm();
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (improvement: Improvement) => {
    const existingCategories = [...new Set(improvements.map(i => i.category))];
    const isExistingCategory = existingCategories.includes(improvement.category) || 
                               defaultCategories.includes(improvement.category);
    
    setFormData({
      category: isExistingCategory ? improvement.category : "custom",
      customCategory: isExistingCategory ? "" : improvement.category,
      task: improvement.task,
      description: improvement.description || "",
      assignee_email: improvement.assignee_email || "",
      due_date: improvement.due_date || "",
      priority: improvement.priority,
      status: improvement.status,
      notes: improvement.notes || "",
    });
    setEditingId(improvement.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this improvement?")) return;

    try {
      const { error } = await supabase
        .from("improvements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Deleted", description: "Improvement has been removed." });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: Status) => {
    try {
      const { error } = await supabase
        .from("improvements")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setImprovements(prev => 
        prev.map(item => item.id === id ? { ...item, status: newStatus } : item)
      );
      
      toast({ 
        title: "Status updated", 
        description: `Changed to ${statusConfig[newStatus].label}` 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Get unique categories
  const existingCategories = [...new Set(improvements.map(i => i.category))];
  const allCategories = [...new Set([...defaultCategories, ...existingCategories])];

  // Group improvements by category
  const groupedImprovements = improvements.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Improvement[]>);

  // Stats
  const completedCount = improvements.filter(i => i.status === "completed").length;
  const inProgressCount = improvements.filter(i => i.status === "in_progress").length;
  const totalCount = improvements.length;

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Improvements Tracker</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              {completedCount} Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              {inProgressCount} In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
              {totalCount - completedCount - inProgressCount} Pending
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Add/Edit Form - Super Admin Only */}
          {isSuperAdmin && (
            <div className="border rounded-lg p-4 bg-muted/30">
              {!showAddForm ? (
                <Button onClick={() => setShowAddForm(true)} className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Improvement
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {editingId ? "Edit Improvement" : "New Improvement"}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category *</label>
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                          <SelectItem value="custom">+ Custom Category</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.category === "custom" && (
                        <Input
                          placeholder="Enter custom category"
                          value={formData.customCategory}
                          onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                        />
                      )}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as Priority }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="high">🔴 High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Task Name */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Task Name *</label>
                      <Input
                        placeholder="Brief description of the improvement"
                        value={formData.task}
                        onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Detailed Description</label>
                      <Textarea
                        placeholder="Provide more details about this improvement..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    {/* Assignee */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assigned To</label>
                      <Select
                        value={formData.assignee_email}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, assignee_email: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.email} value={user.email}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as Status }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">⚪ Not Started</SelectItem>
                          <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                          <SelectItem value="on_hold">🟡 On Hold</SelectItem>
                          <SelectItem value="completed">🟢 Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Notes / Progress Updates</label>
                      <Textarea
                        placeholder="Add any notes, blockers, or progress updates..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingId ? "Save Changes" : "Add Improvement"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Improvements List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : improvements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No improvements tracked yet.</p>
              {isSuperAdmin && <p className="text-sm mt-1">Click "Add New Improvement" to get started.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedImprovements).map(([category, items]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <h3 className="font-semibold">{category}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {items.filter(i => i.status === "completed").length}/{items.length}
                      </Badge>
                    </div>
                  </button>

                  {/* Items */}
                  {expandedCategories.has(category) && (
                    <div className="divide-y">
                      {items.map((item) => {
                        const StatusIcon = statusConfig[item.status].icon;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "px-4 py-3 transition-colors",
                              item.status === "completed" && "bg-green-50/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Status Quick Toggle (Super Admin) */}
                              {isSuperAdmin ? (
                                <Select
                                  value={item.status}
                                  onValueChange={(v) => handleStatusChange(item.id, v as Status)}
                                >
                                  <SelectTrigger className="w-auto h-8 px-2">
                                    <StatusIcon className={cn("h-4 w-4", 
                                      item.status === "completed" && "text-green-600",
                                      item.status === "in_progress" && "text-blue-600",
                                      item.status === "on_hold" && "text-amber-600"
                                    )} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started">⚪ Not Started</SelectItem>
                                    <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                                    <SelectItem value="on_hold">🟡 On Hold</SelectItem>
                                    <SelectItem value="completed">🟢 Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className={cn(
                                  "flex items-center justify-center h-8 w-8 rounded",
                                  statusConfig[item.status].color
                                )}>
                                  <StatusIcon className="h-4 w-4" />
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <p className={cn(
                                      "font-medium",
                                      item.status === "completed" && "line-through text-muted-foreground"
                                    )}>
                                      {item.task}
                                    </p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {item.description}
                                      </p>
                                    )}
                                    
                                    {/* Meta info */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      {/* Priority */}
                                      <Badge 
                                        variant="outline" 
                                        className={cn("text-xs", priorityConfig[item.priority].color)}
                                      >
                                        {priorityConfig[item.priority].label}
                                      </Badge>

                                      {/* Assignee */}
                                      {item.assignee_name && (
                                        <span className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {item.assignee_name}
                                        </span>
                                      )}

                                      {/* Due Date */}
                                      {item.due_date && (
                                        <span className={cn(
                                          "flex items-center gap-1",
                                          isOverdue(item.due_date) && item.status !== "completed" && "text-red-600 font-medium"
                                        )}>
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(item.due_date), "MMM d, yyyy")}
                                          {isOverdue(item.due_date) && item.status !== "completed" && " (Overdue)"}
                                        </span>
                                      )}
                                    </div>

                                    {/* Notes */}
                                    {item.notes && (
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                                        <strong className="text-foreground">Notes:</strong> {item.notes}
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions (Super Admin) */}
                                  {isSuperAdmin && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEdit(item)}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovementsTracker;
