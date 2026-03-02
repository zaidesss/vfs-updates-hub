import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { Filter, ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ColumnFilterType = 'categorical' | 'numeric';

export interface CategoricalFilter {
  type: 'categorical';
  values: Set<string>;
}

export interface NumericFilter {
  type: 'numeric';
  min?: number;
  max?: number;
}

export type ColumnFilter = CategoricalFilter | NumericFilter;

export type SortDirection = 'asc' | 'desc' | null;

interface FilterableColumnHeaderProps {
  columnKey: string;
  label: string;
  filterType: ColumnFilterType;
  uniqueValues?: string[];
  numericRange?: { min: number; max: number };
  activeFilter?: ColumnFilter;
  sortDirection: SortDirection;
  onFilterChange: (columnKey: string, filter: ColumnFilter | null) => void;
  onSortChange: (columnKey: string, direction: SortDirection) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function FilterableColumnHeader({
  columnKey,
  label,
  filterType,
  uniqueValues = [],
  numericRange,
  activeFilter,
  sortDirection,
  onFilterChange,
  onSortChange,
  className,
  style,
}: FilterableColumnHeaderProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localMin, setLocalMin] = useState<string>('');
  const [localMax, setLocalMax] = useState<string>('');

  const isActive = !!activeFilter;

  const filteredValues = useMemo(() => {
    if (!search.trim()) return uniqueValues;
    const q = search.toLowerCase();
    return uniqueValues.filter(v => v.toLowerCase().includes(q));
  }, [uniqueValues, search]);

  const selectedValues = activeFilter?.type === 'categorical' ? activeFilter.values : new Set<string>();

  const handleToggleValue = (value: string) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    if (newSet.size === 0) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, { type: 'categorical', values: newSet });
    }
  };

  const handleSelectAll = () => {
    onFilterChange(columnKey, { type: 'categorical', values: new Set(uniqueValues) });
  };

  const handleClearAll = () => {
    onFilterChange(columnKey, null);
  };

  const handleApplyNumeric = () => {
    const min = localMin ? parseFloat(localMin) : undefined;
    const max = localMax ? parseFloat(localMax) : undefined;
    if (min === undefined && max === undefined) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, { type: 'numeric', min, max });
    }
  };

  const handleClearNumeric = () => {
    setLocalMin('');
    setLocalMax('');
    onFilterChange(columnKey, null);
  };

  const cycleSortDirection = () => {
    if (sortDirection === null) onSortChange(columnKey, 'asc');
    else if (sortDirection === 'asc') onSortChange(columnKey, 'desc');
    else onSortChange(columnKey, null);
  };

  // Sync local numeric state when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && filterType === 'numeric' && activeFilter?.type === 'numeric') {
      setLocalMin(activeFilter.min !== undefined ? String(activeFilter.min) : '');
      setLocalMax(activeFilter.max !== undefined ? String(activeFilter.max) : '');
    }
    if (isOpen) setSearch('');
  };

  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <TableHead className={cn('select-none', className)} style={style}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1 text-left font-medium text-xs w-full hover:text-foreground transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="truncate">{label}</span>
            <Filter className={cn('h-3 w-3 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/50')} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 z-[100]" align="start" side="bottom">
          {/* Sort controls */}
          <button
            onClick={cycleSortDirection}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors mb-1"
          >
            <SortIcon className="h-3.5 w-3.5" />
            <span>Sort {sortDirection === 'asc' ? '(A→Z)' : sortDirection === 'desc' ? '(Z→A)' : ''}</span>
          </button>

          <div className="h-px bg-border my-1" />

          {filterType === 'categorical' ? (
            <>
              {/* Search within values */}
              {uniqueValues.length > 8 && (
                <div className="relative mb-1.5">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              )}

              {/* Select All / Clear */}
              <div className="flex items-center justify-between px-1 mb-1">
                <button onClick={handleSelectAll} className="text-xs text-primary hover:underline">Select All</button>
                <button onClick={handleClearAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
              </div>

              {/* Checklist */}
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredValues.map((val) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedValues.has(val)}
                      onCheckedChange={() => handleToggleValue(val)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{val}</span>
                  </label>
                ))}
                {filteredValues.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No values</p>
                )}
              </div>
            </>
          ) : (
            /* Numeric range */
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Range: {numericRange?.min ?? '—'} – {numericRange?.max ?? '—'}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="h-7 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="default" onClick={handleApplyNumeric} className="h-7 text-xs flex-1">
                  Apply
                </Button>
                <Button size="sm" variant="ghost" onClick={handleClearNumeric} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </TableHead>
  );
}
