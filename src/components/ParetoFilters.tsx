import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface FilterOptions {
  clientes: string[];
  cidades: string[];
  estados: string[];
  categorias: string[];
  vendedores: string[];
  regionais: string[];
  tiposCliente: string[];
}

export interface ActiveFilters {
  dataInicio?: string;
  dataFim?: string;
  cliente?: string;
  cidade?: string;
  estado?: string;
  categoria?: string;
  vendedor?: string;
  regional?: string;
  tipoCliente?: string;
}

interface ParetoFiltersProps {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
  hideCliente?: boolean;
}

export const ParetoFilters: React.FC<ParetoFiltersProps> = ({
  filterOptions,
  activeFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isLoading = false,
  hideCliente = false
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const updateFilter = (key: keyof ActiveFilters, value: string | undefined) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(Boolean).length;
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

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Combobox
          value={activeFilters[key] || "__ALL__"}
          onChange={(value) => updateFilter(key, value === "__ALL__" ? undefined : value)}
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
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          aria-controls="pareto-filters-content"
          role="button"
        >
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros de Análise
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="bg-primary-muted text-primary">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      
      {isOpen && (
        <CardContent id="pareto-filters-content">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Filtros de Data */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Início</Label>
              <Input
                type="date"
                value={activeFilters.dataInicio || ''}
                onChange={(e) => updateFilter('dataInicio', e.target.value || undefined)}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Fim</Label>
              <Input
                type="date"
                value={activeFilters.dataFim || ''}
                onChange={(e) => updateFilter('dataFim', e.target.value || undefined)}
                className="bg-background"
              />
            </div>

            {/* Filtros Dinâmicos */}
            {!hideCliente && renderSelectField('cliente', 'Cliente', filterOptions.clientes, 'Selecione um cliente')}
            {renderSelectField('cidade', 'Cidade', filterOptions.cidades, 'Selecione uma cidade')}
            {renderSelectField('estado', 'Estado', filterOptions.estados, 'Selecione um estado')}
            {renderSelectField('categoria', 'Categoria', filterOptions.categorias, 'Selecione uma categoria')}
            {renderSelectField('vendedor', 'Vendedor', filterOptions.vendedores, 'Selecione um vendedor', user?.role === 'vendedor')}
            {renderSelectField('regional', 'Regional', filterOptions.regionais, 'Selecione uma regional')}
            {renderSelectField('tipoCliente', 'Tipo Cliente', filterOptions.tiposCliente, 'Selecione um tipo')}
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClearFilters}
              disabled={isLoading || getActiveFilterCount() === 0}
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
              {isLoading ? (
                <>
                  <Filter className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                'Aplicar Análise'
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};