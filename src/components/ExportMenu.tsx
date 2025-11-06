import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileDown, FileSpreadsheet } from 'lucide-react';
import { downloadCSV, downloadXLS, ExportColumn } from '@/utils/export';

interface ExportMenuProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  fileBaseName: string;
}

export function ExportMenu<T>({ data, columns, fileBaseName }: ExportMenuProps<T>) {
  const doCSV = () => downloadCSV(fileBaseName, data, columns);
  const doXLS = () => downloadXLS(fileBaseName, data, columns);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={doCSV} className="gap-2">
          <FileDown className="h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={doXLS} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          XLS
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}