import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HistoryFilters, HistoryFilterOptions, ActiveHistoryFilters } from '@/components/HistoryFilters';
import { GoogleSheetsService, HistoryData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpDown } from 'lucide-react';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

const History = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoryData[]>([]);
  const [filteredData, setFilteredData] = useState<HistoryData[]>([]);
  type SortableHistoryKey = keyof HistoryData | 'valorUnitario';
  const [sortKey, setSortKey] = useState<SortableHistoryKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ clientes: [], categorias: [], regionais: [], estados: [], cidades: [], vendedores: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveHistoryFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Obter cliente pré-selecionado do state da navegação
  const prefilledClient = location.state?.prefilledClient;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const historyData = await service.fetchHistoryData();
        setData(historyData);
        
        // Extract filter options, filtering out empty values
        const extractUnique = (data: HistoryData[], key: keyof HistoryData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        // Filtrar opções de vendedores baseado no papel do usuário
        const allVendedores = extractUnique(historyData, 'vendedor').sort();
        const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor 
          ? [user.vendedor] // Se for vendedor, mostrar apenas seu próprio nome
          : allVendedores;   // Se for admin, mostrar todos

        setFilterOptions({
          clientes: extractUnique(historyData, 'nomeFantasia').sort(),
          categorias: extractUnique(historyData, 'categoria').sort(),
          regionais: extractUnique(historyData, 'regional').sort(),
          estados: extractUnique(historyData, 'uf').sort(),
          cidades: extractUnique(historyData, 'cidade').sort(),
          vendedores: vendedoresOptions,
        });

        // Aplicar filtros automáticos
        let initialFilteredData = historyData;
        let initialFilters: ActiveHistoryFilters = {};
        
        // Filtro automático para vendedor
        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters.vendedor = user.vendedor;
          initialFilteredData = initialFilteredData.filter(item => item.vendedor === user.vendedor);
        }

        // Filtro automático para cliente pré-selecionado
        if (prefilledClient) {
          initialFilters.cliente = prefilledClient;
          initialFilteredData = initialFilteredData.filter(item => item.nomeFantasia === prefilledClient);
        }

        setActiveFilters(initialFilters);
        setFilteredData(initialFilteredData);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do histórico.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, prefilledClient, toast]);

  const handleApplyFilters = () => {
    let filtered = data.filter(item => {
      if (!item.dataPedido) return false; // Ignore entries with no date
      const itemDate = new Date(item.dataPedido.split('/').reverse().join('-'));
      itemDate.setHours(0, 0, 0, 0);

      if (activeFilters.dataInicio) {
        const startDate = new Date(activeFilters.dataInicio);
        startDate.setHours(0, 0, 0, 0);
        if (itemDate < startDate) return false;
      }

      if (activeFilters.dataFim) {
        const endDate = new Date(activeFilters.dataFim);
        endDate.setHours(0, 0, 0, 0);
        if (itemDate > endDate) return false;
      }

      if (activeFilters.cliente && item.nomeFantasia !== activeFilters.cliente) return false;
      if (activeFilters.categoria && item.categoria !== activeFilters.categoria) return false;
      if (activeFilters.regional && item.regional !== activeFilters.regional) return false;
      if (activeFilters.estado && item.uf !== activeFilters.estado) return false;
      if (activeFilters.cidade && item.cidade !== activeFilters.cidade) return false;
      if (activeFilters.vendedor && item.vendedor !== activeFilters.vendedor) return false;
      return true;
    });
    setFilteredData(filtered);
  };

  const handleClearFilters = () => {
    let clearedFilters = {};
    
    // Se o usuário for vendedor, manter o filtro de vendedor
    if (user && user.role === 'vendedor' && user.vendedor) {
      clearedFilters = { vendedor: user.vendedor };
    }
    
    setActiveFilters(clearedFilters);
    
    // Aplicar os filtros (se houver) aos dados
    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      dataToShow = data.filter(item => {
        if ('vendedor' in clearedFilters && item.vendedor !== (clearedFilters as { vendedor: string }).vendedor) return false;
        return true;
      });
    }
    
    setFilteredData(dataToShow);
    
    toast({
      title: "Filtros limpos",
      description: user?.role === 'vendedor' 
        ? "Filtros limpos. Filtro de vendedor mantido."
        : "Mostrando todos os dados disponíveis.",
    });
  };

  const handleBackToPareto = () => {
    navigate('/pareto-clientes');
  };

  const getComparable = (item: HistoryData, key: SortableHistoryKey) => {
    if (key === 'dataPedido') {
      const [d, m, y] = (item.dataPedido || '').split('/');
      return new Date(parseInt(y || '0'), parseInt(m || '1') - 1, parseInt(d || '1')).getTime();
    }
    if (key === 'valorUnitario') {
      const q = item.quantidade || 0;
      const v = item.valor || 0;
      return q > 0 ? v / q : 0;
    }
    if (key === 'quantidade' || key === 'valor') {
      return item[key] as number;
    }
    return String(item[key as keyof HistoryData] || '').toLowerCase();
  };

  const handleSort = (key: SortableHistoryKey) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    const arr = [...filteredData];
    if (!sortKey) return arr;
    return arr.sort((a, b) => {
      const va = getComparable(a, sortKey);
      const vb = getComparable(b, sortKey);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), 'pt-BR');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortOrder]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Histórico de Compras 2024/2025</h1>
        </div>
        
        <HistoryFilters 
          options={filterOptions} 
          activeFilters={activeFilters} 
          onFilterChange={setActiveFilters} 
          onApply={handleApplyFilters} 
          onClear={handleClearFilters} 
        />
        
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('dataPedido')}>
                  <div className="flex items-center gap-1">
                    <span>Data Pedido</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'dataPedido' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomeFantasia')}>
                  <div className="flex items-center gap-1">
                    <span>Nome Fantasia</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'nomeFantasia' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('cidade')}>
                  <div className="flex items-center gap-1">
                    <span>Cidade</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'cidade' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('uf')}>
                  <div className="flex items-center gap-1">
                    <span>UF</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'uf' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('categoria')}>
                  <div className="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'categoria' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('formaPagamento')}>
                  <div className="flex items-center gap-1">
                    <span>Forma de Pagamento</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'formaPagamento' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nf')}>
                  <div className="flex items-center gap-1">
                    <span>NF-</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'nf' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('vendedor')}>
                  <div className="flex items-center gap-1">
                    <span>Vendedor</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'vendedor' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('quantidade')}>
                  <div className="flex items-center gap-1">
                    <span>Qtdde</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'quantidade' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('valorUnitario')}>
                  <div className="flex items-center gap-1">
                    <span>Valor Unitário</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'valorUnitario' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="relative cursor-pointer select-none" onClick={() => handleSort('valor')}>
                  <div className="flex flex-col items-end">
                    <div className="font-bold mb-2">
                      {filteredData.reduce((total, item) => total + item.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="flex items-center gap-1">
                      <span>VALOR</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      {sortKey === 'valor' && (
                        <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                      )}
                    </div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.dataPedido}</TableCell>
                  <TableCell>{item.nomeFantasia}</TableCell>
                  <TableCell>{item.cidade}</TableCell>
                  <TableCell>{item.uf}</TableCell>
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{item.formaPagamento}</TableCell>
                  <TableCell>{item.nf}</TableCell>
                  <TableCell>{item.vendedor}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell>{(item.quantidade ? item.valor / item.quantidade : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default History;