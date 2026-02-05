
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface ExpensesFilterOptions {
  vendedores: string[];
  regionais: string[];
  municipios: string[];
  categorias: string[];
}

export interface ExpensesActiveFilters {
  dataInicio?: string;
  dataFim?: string;
  vendedor?: string[];
  regional?: string[];
  municipio?: string[];
  categoria?: string[];
}

interface ExpensesFiltersProps {
  filterOptions: ExpensesFilterOptions;
  activeFilters: ExpensesActiveFilters;
  onFilterChange: (filters: ExpensesActiveFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  regionalDisabled?: boolean;
}

export const ExpensesFilters: React.FC<ExpensesFiltersProps> = ({
  filterOptions,
  activeFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  regionalDisabled = false,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const updateFilter = (key: keyof ExpensesActiveFilters, values: string[] | undefined) => {
    onFilterChange({ ...activeFilters, [key]: values });
  };

  const updateDateFilter = (key: 'dataInicio' | 'dataFim', value: string) => {
    onFilterChange({ ...activeFilters, [key]: value || undefined });
  };

  const getActiveFilterCount = () => {
    return Object.entries(activeFilters)
      .filter(([key, val]) => {
        if (key === 'dataInicio' || key === 'dataFim') return Boolean(val);
        const arr = val as string[] | undefined;
        return Array.isArray(arr) && arr.length > 0;
      }).length;
  };

  const renderSelectField = (
    key: keyof ExpensesActiveFilters,
    label: string,
    options: string[],
    placeholder: string,
    disabled: boolean = false
  ) => {
    const comboboxOptions = [
      { value: "__ALL__", label: "Todos" },
      ...options.map(opt => ({ value: opt, label: opt }))
    ];

    const current = (activeFilters[key] as string[] | undefined) || [];

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

  // Determine if filters should be disabled based on user role
  const isVendedorFilterDisabled = false; // User requested to unlock Vendedor filter
  const isRegionalFilterDisabled = regionalDisabled;

  // Pre-select regional if disabled (handled in parent usually, but good to check visual state)
  
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Filter className="h-5 w-5 text-green-600" />
            Filtros
            {getActiveFilterCount() > 0 && (
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              disabled={isLoading || getActiveFilterCount() === 0}
              className="text-slate-500 hover:text-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button
              onClick={onApplyFilters}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RotateCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`${isOpen ? 'block' : 'hidden'} md:block pt-0`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Período</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={activeFilters.dataInicio || ''}
                onChange={(e) => updateDateFilter('dataInicio', e.target.value)}
                className="w-full"
              />
              <Input
                type="date"
                value={activeFilters.dataFim || ''}
                onChange={(e) => updateDateFilter('dataFim', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Vendedor Filter */}
          {renderSelectField(
            'vendedor',
            'Vendedor',
            filterOptions.vendedores,
            'Selecione vendedores...',
            isVendedorFilterDisabled
          )}

          {/* Regional Filter */}
          {renderSelectField(
            'regional',
            'Regional',
            filterOptions.regionais,
            'Selecione regionais...',
            isRegionalFilterDisabled
          )}

          {/* Municipio Filter */}
          {renderSelectField(
            'municipio',
            'Município',
            filterOptions.municipios,
            'Selecione municípios...'
          )}

          {/* Categoria Filter */}
          {renderSelectField(
            'categoria',
            'Categoria',
            filterOptions.categorias,
            'Selecione categorias...'
          )}
        </div>
      </CardContent>
    </Card>
  );
};
