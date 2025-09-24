import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';

export interface HistoryFilterOptions {
  clientes: string[];
  categorias: string[];
  regionais: string[];
  estados: string[];
  cidades: string[];
  vendedores: string[];
}

export interface ActiveHistoryFilters {
  dataInicio?: string;
  dataFim?: string;
  cliente?: string;
  categoria?: string;
  regional?: string;
  estado?: string;
  cidade?: string;
  vendedor?: string;
}

interface HistoryFiltersProps {
  options: HistoryFilterOptions;
  activeFilters: ActiveHistoryFilters;
  onFilterChange: (filters: ActiveHistoryFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

const keyMap: { [key: string]: keyof ActiveHistoryFilters } = {
  clientes: 'cliente',
  categorias: 'categoria',
  regionais: 'regional',
  estados: 'estado',
  cidades: 'cidade',
  vendedores: 'vendedor',
};

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ options, activeFilters, onFilterChange, onApply, onClear }) => {
  const handleInputChange = (field: keyof ActiveHistoryFilters, value: string) => {
    onFilterChange({ ...activeFilters, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Input type="date" value={activeFilters.dataInicio || ''} onChange={(e) => handleInputChange('dataInicio', e.target.value)} />
      <Input type="date" value={activeFilters.dataFim || ''} onChange={(e) => handleInputChange('dataFim', e.target.value)} />
      {Object.keys(options).map((key) => {
        const filterKey = keyMap[key as keyof typeof keyMap];
        const opts = options[key as keyof HistoryFilterOptions].map(o => ({ value: o, label: o }));
        return (
        <Combobox 
          key={key} 
          options={opts}
          value={activeFilters[filterKey]}
          onChange={(value) => handleInputChange(filterKey, value)}
          placeholder={`Selecionar ${key}`}
          searchPlaceholder="Pesquisar..."
          noResultsMessage="Nenhum resultado encontrado."
        />
      )})}
      <Button onClick={onApply}>Aplicar Filtros</Button>
      <Button onClick={onClear} variant="outline">Limpar Filtros</Button>
    </div>
  );
};