import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface ZdInstanceFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export function ZdInstanceFilter({ value, onChange }: ZdInstanceFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Instances" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Instances</SelectItem>
          <SelectItem value="ZD1">ZD1</SelectItem>
          <SelectItem value="ZD2">ZD2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}