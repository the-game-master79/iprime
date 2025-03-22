import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => React.ReactNode;
  }[];
  searchable?: boolean;
  downloadable?: boolean;
  onSearch?: (term: string) => void;
  onDownload?: () => void;
}

export function DataTable<T>({ 
  data, 
  columns,
  searchable,
  downloadable,
  onSearch,
  onDownload 
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {(searchable || downloadable) && (
        <div className="flex items-center gap-4">
          {searchable && (
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search..." 
                onChange={(e) => onSearch?.(e.target.value)}
                className="max-w-xs"
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {downloadable && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={String(column.accessorKey)}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, i) => (
            <TableRow key={i}>
              {columns.map((column) => (
                <TableCell key={String(column.accessorKey)}>
                  {column.cell ? column.cell(item) : String(item[column.accessorKey])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
