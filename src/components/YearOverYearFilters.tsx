import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Filter, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface FilterOptions {
  cliente: string[];
  cidade: string[];
  estado: string[];
  categoria: string[];
  vendedor: string[];
  regional: string[];
}

export interface ActiveFilters {
  cliente?: string[];
  cidade?: string[];
  estado?: string[];
  categoria?: string[];
  vendedor?: string[];
  regional?: string[];
}

interface YearOverYearFiltersProps {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export const YearOverYearFilters: React.FC<YearOverYearFiltersProps> = ({
  filterOptions,
  activeFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
}) => {
  const { user } = useAuth();

  const updateFilter = (key: keyof ActiveFilters, values: string[] | undefined) => {
    onFilterChange({ ...activeFilters, [key]: values });
  };

  const renderSelectField = (
    key: keyof ActiveFilters,
    label: string,
    options: string[],
    placeholder: string,
    disabled: boolean = false
  ) => {
    const comboboxOptions = [
      { value: "__ALL__", label: "Todos" },
      ...options.map(opt => ({ value: opt, label: opt }))
    ];

    const current = (activeFilters[key] as string[] | undefined) || []

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Combobox
          multiple
          values={current}
          onChangeValues={(vals) => updateFilter(key, vals && vals.length > 0 ? vals : undefined)}
          options={comboboxOptions}
          placeholder={placeholder}
          searchPlaceholder="Pesquisar..."
          noResultsMessage="Nenhum resultado encontrado."
          disabled={disabled}
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filtros de Comparação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {renderSelectField('cliente', 'Cliente', filterOptions.cliente, 'Selecione um cliente')}
          {renderSelectField('cidade', 'Cidade', filterOptions.cidade, 'Selecione uma cidade')}
          {renderSelectField('estado', 'Estado', filterOptions.estado, 'Selecione um estado')}
          {renderSelectField('categoria', 'Categoria', filterOptions.categoria, 'Selecione uma categoria')}
          {renderSelectField('vendedor', 'Vendedor', filterOptions.vendedor, 'Selecione um vendedor', user?.role === 'vendedor')}
          {renderSelectField('regional', 'Regional', filterOptions.regional, 'Selecione uma regional', user?.role === 'gerente')}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClearFilters}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar Filtros
          </Button>

          <Button
            onClick={onApplyFilters}
            disabled={isLoading}
            className="bg-gradient-primary hover:opacity-90 min-w-[120px]"
          >
            {isLoading ? 'Comparando...' : 'Aplicar Filtros'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};