import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface FilterOptions {
  cliente: string[];
  cidade: string[];
  estado: string[];
  categoria: string[];
  vendedor: string[];
  regional: string[];
  tiposCliente?: string[]; // opcional
}

export interface ActiveFilters {
  dataInicio?: string;
  dataFim?: string;
  cliente?: string[];
  cidade?: string[];
  estado?: string[];
  categoria?: string[];
  vendedor?: string[];
  regional?: string[];
  tipoCliente?: string[]; // opcional
}

interface HistoryFiltersProps {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  // Área opcional para filtros adicionais (ex.: RFV)
  extraFilters?: React.ReactNode;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  filterOptions,
  activeFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  extraFilters,
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
          Filtros do Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Filtros de Data */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Início</Label>
            <Input
              type="date"
              value={activeFilters.dataInicio || ''}
              onChange={(e) => updateFilter('dataInicio', e.target.value ? [e.target.value] : undefined)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data Fim</Label>
            <Input
              type="date"
              value={activeFilters.dataFim || ''}
              onChange={(e) => updateFilter('dataFim', e.target.value ? [e.target.value] : undefined)}
              className="bg-background"
            />
          </div>

          {/* Demais Filtros */}
          {renderSelectField('cliente', 'Cliente', filterOptions.cliente, 'Selecione um cliente')}
          {renderSelectField('cidade', 'Cidade', filterOptions.cidade, 'Selecione uma cidade')}
          {renderSelectField('estado', 'Estado', filterOptions.estado, 'Selecione um estado')}
          {renderSelectField('categoria', 'Categoria', filterOptions.categoria, 'Selecione uma categoria')}
          {renderSelectField(
            'vendedor',
            'Vendedor',
            filterOptions.vendedor,
            'Selecione um vendedor',
            user?.role === 'vendedor' && ((user?.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') !== 'sara')
          )}
          {renderSelectField(
            'regional',
            'Regional',
            filterOptions.regional,
            'Selecione uma regional',
            (user?.role === 'gerente') || ['sara','joao'].includes(((user?.username || '').toLowerCase().normalize('NFD').replace(/\[\u0300-\u036f]/g, '')))
          )}

          {/* Tipo de Cliente: renderiza somente se houver opções */}
          {Array.isArray(filterOptions.tiposCliente) && filterOptions.tiposCliente.length > 0 && (
            renderSelectField(
              'tipoCliente',
              'Tipo de Cliente',
              filterOptions.tiposCliente,
              'Selecione um tipo'
            )
          )}
      </div>

      {/* Filtros adicionais (RFV, etc.) */}
      {extraFilters && (
        <div className="mt-4">
          {extraFilters}
        </div>
      )}

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
            {isLoading ? 'Analisando...' : 'Aplicar Filtros'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
