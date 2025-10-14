import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleInputChange = (field: keyof ActiveHistoryFilters, value: string) => {
    onFilterChange({ ...activeFilters, [field]: value });
  };

  return (
    <div className={`bg-white ${isOpen ? 'p-6' : 'p-3'} rounded-lg shadow-sm border mb-6`}>
      <div
        className="flex items-center justify-between mb-2 cursor-pointer select-none"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="history-filters-content"
      >
        <h2 className="text-lg font-semibold">Filtros</h2>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div id="history-filters-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input type="date" value={activeFilters.dataInicio || ''} onChange={(e) => handleInputChange('dataInicio', e.target.value)} />
            <Input type="date" value={activeFilters.dataFim || ''} onChange={(e) => handleInputChange('dataFim', e.target.value)} />
            {Object.keys(options).map((key) => {
              const filterKey = keyMap[key as keyof typeof keyMap];
              const opts = options[key as keyof HistoryFilterOptions].map(o => ({ value: o, label: o }));
              const isVendedorField = key === 'vendedores';
              const shouldDisable = isVendedorField && user?.role === 'vendedor';
              
              return (
              <Combobox 
                key={key} 
                options={opts}
                value={activeFilters[filterKey] || ''}
                onChange={(value) => handleInputChange(filterKey, value)}
                placeholder={`Selecionar ${key}`}
                searchPlaceholder="Pesquisar..."
                noResultsMessage="Nenhum resultado encontrado."
                disabled={shouldDisable}
              />
            )})}
          </div>
          <div className="flex gap-2">
            <Button onClick={onApply}>Aplicar Filtros</Button>
            <Button onClick={onClear} variant="outline">Limpar Filtros</Button>
          </div>
        </div>
      )}
    </div>
  );
};