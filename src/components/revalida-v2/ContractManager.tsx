import { useState, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2 } from 'lucide-react';
import { RevalidaV2Contract, listContracts, createContract, updateContract, deleteContract } from '@/lib/revalidaV2Api';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const ContractManager = forwardRef<HTMLDivElement>((_, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractName, setContractName] = useState('');

  const { data: contracts = [], refetch } = useQuery({
    queryKey: ['revalida-v2-contracts'],
    queryFn: listContracts,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !contractName) {
      toast.error('Please provide a name and select a file');
      return;
    }

    setIsUploading(true);
    try {
      // For now, store parsed_content as a placeholder
      // In production, you'd parse the PDF using a library
      const contract = await createContract({
        name: contractName,
        parsed_content: `[PDF Content from ${selectedFile.name}]`,
        is_active: true,
        uploaded_by: 'current_user',
      });

      refetch();
      setSelectedFile(null);
      setContractName('');
      toast.success('Contract uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload contract');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (contract: RevalidaV2Contract) => {
    try {
      await updateContract(contract.id, { is_active: !contract.is_active });
      refetch();
      toast.success(`Contract ${!contract.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update contract');
    }
  };

  const handleDelete = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    
    try {
      await deleteContract(contractId);
      refetch();
      toast.success('Contract deleted');
    } catch (error) {
      toast.error('Failed to delete contract');
    }
  };

  return (
    <div ref={ref} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Contract</CardTitle>
          <CardDescription>Add PDF contracts to the merged knowledge base for question generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contractName">Contract Name</Label>
            <Input
              id="contractName"
              placeholder="e.g., Email Support SLA"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractFile">PDF File</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input
                id="contractFile"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="contractFile" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Click to select PDF or drag and drop'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <Button onClick={handleUpload} disabled={isUploading} className="w-full">
            {isUploading ? 'Uploading...' : 'Upload Contract'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Contracts</CardTitle>
          <CardDescription>{contracts.length} contract(s) in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {contracts.map(contract => (
                <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{contract.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contract.support_type && `${contract.support_type} • `}
                      {new Date(contract.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={contract.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleActive(contract)}
                    >
                      {contract.is_active ? 'Active' : 'Inactive'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contract.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

ContractManager.displayName = 'ContractManager';
