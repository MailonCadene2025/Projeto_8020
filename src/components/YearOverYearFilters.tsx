import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

export interface YearOverYearFilterOptions {
  clientes: string[];
  categorias: string[];
  regionais: string[];
  estados: string[];
  cidades: string[];
  vendedores: string[];
}

export interface ActiveYearOverYearFilters {
  cliente?: string;
  categoria?: string;
  regional?: string;
  estado?: string;
  cidade?: string;
  vendedor?: string;
}

interface YearOverYearFiltersProps {
  options: YearOverYearFilterOptions;
  activeFilters: ActiveYearOverYearFilters;
  onFilterChange: (filters: ActiveYearOverYearFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

const keyMap: { [key: string]: keyof ActiveYearOverYearFilters } = {
  clientes: 'cliente',
  categorias: 'categoria',
  regionais: 'regional',
  estados: 'estado',
  cidades: 'cidade',
  vendedores: 'vendedor',
};

export const YearOverYearFilters: React.FC<YearOverYearFiltersProps> = ({ options, activeFilters, onFilterChange, onApply, onClear }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (field: keyof ActiveYearOverYearFilters, value: string) => {
    onFilterChange({ ...activeFilters, [field]: value });
  };

  return (
    <div className={`bg-white ${isOpen ? 'p-6' : 'p-3'} rounded-lg shadow-sm border mb-6`}>
      <div
        className="flex items-center justify-between mb-2 cursor-pointer select-none"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-controls="yoy-filters-content"
      >
        <h2 className="text-lg font-semibold">Filtros</h2>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div id="yoy-filters-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {Object.entries(options).map(([key, values]) => {
              const filterKey = keyMap[key];
              const isVendedorField = key === 'vendedores';
              const isDisabled = isVendedorField && user?.role === 'vendedor';
              
              return (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {key === 'clientes' ? 'Cliente' :
                     key === 'categorias' ? 'Categoria' :
                     key === 'regionais' ? 'Regional' :
                     key === 'estados' ? 'Estado' :
                     key === 'cidades' ? 'Cidade' :
                     key === 'vendedores' ? 'Vendedor' : key}
                  </label>
                  <Combobox
                    options={values.map(value => ({ value, label: value }))}
                    value={activeFilters[filterKey] || ''}
                    onChange={(value) => handleInputChange(filterKey, value)}
                    placeholder={`Selecione ${key === 'clientes' ? 'cliente' :
                                 key === 'categorias' ? 'categoria' :
                                 key === 'regionais' ? 'regional' :
                                 key === 'estados' ? 'estado' :
                                 key === 'cidades' ? 'cidade' :
                                 key === 'vendedores' ? 'vendedor' : key}`}
                    disabled={isDisabled}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button onClick={onApply}>Aplicar Filtros</Button>
            <Button variant="outline" onClick={onClear}>Limpar Filtros</Button>
          </div>
        </div>
      )}
    </div>
  );
};