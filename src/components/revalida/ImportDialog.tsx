import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QuestionImport } from '@/lib/revalidaApi';
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (title: string, questions: QuestionImport[]) => Promise<void>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function ImportDialog({ isOpen, onOpenChange, onImport }: ImportDialogProps) {
  const { toast } = useToast();
  const [batchTitle, setBatchTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionImport[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const validateQuestions = (data: any[]): { questions: QuestionImport[]; errors: ValidationError[] } => {
    const validatedQuestions: QuestionImport[] = [];
    const validationErrors: ValidationError[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel row (1-indexed + header)

      // Validate type
      const type = (row.type || '').toLowerCase().trim();
      if (!['mcq', 'true_false', 'situational'].includes(type)) {
        validationErrors.push({
          row: rowNum,
          field: 'type',
          message: `Invalid type "${row.type}". Must be mcq, true_false, or situational.`,
        });
        return;
      }

      // Validate prompt
      if (!row.prompt || !row.prompt.trim()) {
        validationErrors.push({
          row: rowNum,
          field: 'prompt',
          message: 'Prompt is required.',
        });
        return;
      }

      // Validate points
      const points = parseInt(row.points) || 1;
      if (points < 1) {
        validationErrors.push({
          row: rowNum,
          field: 'points',
          message: 'Points must be at least 1.',
        });
        return;
      }

      // Validate MCQ choices
      if (type === 'mcq') {
        if (!row.choice_a || !row.choice_b) {
          validationErrors.push({
            row: rowNum,
            field: 'choices',
            message: 'MCQ requires at least choice_a and choice_b.',
          });
          return;
        }
        if (!row.correct_answer || !['A', 'B', 'C', 'D'].includes(row.correct_answer.toUpperCase())) {
          validationErrors.push({
            row: rowNum,
            field: 'correct_answer',
            message: 'MCQ requires correct_answer to be A, B, C, or D.',
          });
          return;
        }
      }

      // Validate True/False
      if (type === 'true_false') {
        if (!row.correct_answer || !['True', 'False'].includes(row.correct_answer)) {
          validationErrors.push({
            row: rowNum,
            field: 'correct_answer',
            message: 'True/False requires correct_answer to be "True" or "False".',
          });
          return;
        }
      }

      validatedQuestions.push({
        type: type as 'mcq' | 'true_false' | 'situational',
        prompt: row.prompt.trim(),
        choice_a: row.choice_a?.trim() || undefined,
        choice_b: row.choice_b?.trim() || undefined,
        choice_c: row.choice_c?.trim() || undefined,
        choice_d: row.choice_d?.trim() || undefined,
        correct_answer: type === 'situational' ? undefined : row.correct_answer?.toString().trim(),
        points,
        order_index: parseInt(row.order_index) || index,
        is_required: row.is_required !== false && row.is_required !== 'false',
      });
    });

    return { questions: validatedQuestions, errors: validationErrors };
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setQuestions([]);
    setErrors([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Look for Batch sheet for title
      const batchSheet = workbook.Sheets['Batch'];
      if (batchSheet) {
        const batchData = XLSX.utils.sheet_to_json(batchSheet);
        if (batchData.length > 0 && (batchData[0] as any).title) {
          setBatchTitle((batchData[0] as any).title);
        }
      }

      // Look for Questions sheet
      const questionsSheet = workbook.Sheets['Questions'] || workbook.Sheets[workbook.SheetNames[0]];
      if (!questionsSheet) {
        throw new Error('No Questions sheet found');
      }

      const questionsData = XLSX.utils.sheet_to_json(questionsSheet);
      if (questionsData.length === 0) {
        throw new Error('No questions found in the file');
      }

      const { questions: validQuestions, errors: validationErrors } = validateQuestions(questionsData);
      setQuestions(validQuestions);
      setErrors(validationErrors);

      if (validationErrors.length > 0) {
        toast({
          title: 'Validation Warnings',
          description: `Found ${validationErrors.length} issue(s). Please review before importing.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'File Parsed',
          description: `Found ${validQuestions.length} valid question(s).`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error Reading File',
        description: error.message || 'Failed to parse the file.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  }, [toast]);

  const handleImport = async () => {
    if (!batchTitle.trim()) {
      toast({
        title: 'Missing Title',
        description: 'Please enter a batch title.',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'No Questions',
        description: 'Please upload a valid file with questions.',
        variant: 'destructive',
      });
      return;
    }

    if (errors.length > 0) {
      toast({
        title: 'Validation Errors',
        description: 'Please fix all errors before importing.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      await onImport(batchTitle.trim(), questions);
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to create batch.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setBatchTitle('');
    setQuestions([]);
    setErrors([]);
    onOpenChange(false);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Question Batch
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with your questions. Format: type, prompt, choice_a, choice_b, choice_c, choice_d, correct_answer, points, order_index, is_required
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Batch Title */}
          <div className="space-y-2">
            <Label htmlFor="batch-title">Batch Title *</Label>
            <Input
              id="batch-title"
              value={batchTitle}
              onChange={(e) => setBatchTitle(e.target.value)}
              placeholder="e.g., February Week 1"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File *</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="flex-1"
              />
              {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: .xlsx, .xls, .csv
            </p>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Validation Errors</span>
              </div>
              <ul className="text-sm space-y-1">
                {errors.slice(0, 5).map((err, idx) => (
                  <li key={idx} className="text-destructive">
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {errors.length > 5 && (
                  <li className="text-muted-foreground">
                    ...and {errors.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {questions.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {questions.length} questions | {totalPoints} total points
                  </span>
                </div>
              </div>
              <ScrollArea className="flex-1 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="w-20">Answer</TableHead>
                      <TableHead className="w-16">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {q.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {q.prompt}
                        </TableCell>
                        <TableCell>{q.correct_answer || '—'}</TableCell>
                        <TableCell>{q.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || questions.length === 0 || errors.length > 0 || !batchTitle.trim()}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Batch
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
