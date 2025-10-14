import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HistoryFilters, HistoryFilterOptions, ActiveHistoryFilters } from '@/components/HistoryFilters';
import { GoogleSheetsService, DemoComodatosData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpDown } from 'lucide-react';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

const DemoComodatos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DemoComodatosData[]>([]);
  const [filteredData, setFilteredData] = useState<DemoComodatosData[]>([]);
  const [sortKey, setSortKey] = useState<keyof DemoComodatosData | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ clientes: [], categorias: [], regionais: [], estados: [], cidades: [], vendedores: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveHistoryFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const demoData = await service.fetchDemoComodatosData();
        setData(demoData);

        const extractUnique = (data: DemoComodatosData[], key: keyof DemoComodatosData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        const allVendedores = extractUnique(demoData, 'vendedor').sort();
        const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor 
          ? [user.vendedor]
          : allVendedores;

        setFilterOptions({
          clientes: extractUnique(demoData, 'nomeFantasia').sort(),
          categorias: extractUnique(demoData, 'categoria').sort(),
          regionais: extractUnique(demoData, 'regional').sort(),
          estados: extractUnique(demoData, 'uf').sort(),
          cidades: extractUnique(demoData, 'cidade').sort(),
          vendedores: vendedoresOptions,
        });

        let initialFilteredData = demoData;
        let initialFilters: ActiveHistoryFilters = {};

        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters.vendedor = user.vendedor;
          initialFilteredData = initialFilteredData.filter(item => item.vendedor === user.vendedor);
        }

        setActiveFilters(initialFilters);
        setFilteredData(initialFilteredData);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados de demonstrações/comodatos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados de Demonstrações e Comodatos.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleApplyFilters = () => {
    let filtered = data.filter(item => {
      if (!item.dataPedido) return false;
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
    let clearedFilters: ActiveHistoryFilters | {} = {};

    if (user && user.role === 'vendedor' && user.vendedor) {
      clearedFilters = { vendedor: user.vendedor };
    }

    setActiveFilters(clearedFilters as ActiveHistoryFilters);

    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      dataToShow = data.filter(item => {
        if ('vendedor' in (clearedFilters as { vendedor: string }) && item.vendedor !== (clearedFilters as { vendedor: string }).vendedor) return false;
        return true;
      });
    }

    setFilteredData(dataToShow);

    toast({
      title: 'Filtros limpos',
      description: user?.role === 'vendedor' ? 'Filtros limpos. Filtro de vendedor mantido.' : 'Mostrando todos os dados disponíveis.',
    });
  };

  const handleBackToPareto = () => {
    navigate('/');
  };

  const getComparable = (item: DemoComodatosData, key: keyof DemoComodatosData) => {
    if (key === 'dataPedido') {
      const [d, m, y] = (item.dataPedido || '').split('/');
      return new Date(parseInt(y || '0'), parseInt(m || '1') - 1, parseInt(d || '1')).getTime();
    }
    if (key === 'quantidade' || key === 'valor') {
      return item[key] as number;
    }
    return String(item[key] || '').toLowerCase();
  };

  const handleSort = (key: keyof DemoComodatosData) => {
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
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleBackToPareto} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para 80/20
          </Button>
          <h1 className="text-2xl font-bold">Demonstrações e Comodatos</h1>
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('categoria')}>
                  <div className="flex items-center gap-1">
                    <span>Categoria</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'categoria' && (
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('regional')}>
                  <div className="flex items-center gap-1">
                    <span>REGIONAL</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'regional' && (
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
                  <TableCell>{item.categoria}</TableCell>
                  <TableCell>{item.vendedor}</TableCell>
                  <TableCell>{item.cidade}</TableCell>
                  <TableCell>{item.uf}</TableCell>
                  <TableCell>{item.regional}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
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

export default DemoComodatos;