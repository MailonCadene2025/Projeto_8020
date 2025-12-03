import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HistoryFilters } from '@/components/HistoryFilters';
import type { FilterOptions as HistoryFilterOptions, ActiveFilters as BaseActiveFilters } from '@/components/HistoryFilters';
type ActiveHistoryFilters = BaseActiveFilters & {
  dataInicio?: string;
  dataFim?: string;
};
import { GoogleSheetsService, DemoComodatosData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { ExportMenu } from '@/components/ExportMenu';
import type { ExportColumn } from '@/utils/export';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

const DemoComodatos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DemoComodatosData[]>([]);
  const [filteredData, setFilteredData] = useState<DemoComodatosData[]>([]);
  const [sortKey, setSortKey] = useState<'diasEmCampo' | keyof DemoComodatosData | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ cliente: [], categoria: [], regional: [], estado: [], cidade: [], vendedor: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveHistoryFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const demoData = await service.fetchDemoComodatosData();
        setData(demoData);

        const extractUnique = (data: DemoComodatosData[], key: keyof DemoComodatosData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        const allVendedores = extractUnique(demoData, 'vendedor').sort();
        const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara')
          ? [user.vendedor]
          : allVendedores;

        setFilterOptions({
          cliente: extractUnique(demoData, 'nomeFantasia').sort(),
          categoria: extractUnique(demoData, 'categoria').sort(),
          regional: extractUnique(demoData, 'regional').sort(),
          estado: extractUnique(demoData, 'uf').sort(),
          cidade: extractUnique(demoData, 'cidade').sort(),
          vendedor: vendedoresOptions,
        });

        let initialFilteredData = demoData;
        let initialFilters: ActiveHistoryFilters = {};

        if (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara') {
          initialFilters.vendedor = [user.vendedor];
          initialFilteredData = initialFilteredData.filter(item => item.vendedor === user.vendedor);
        }

        // Trava de regional: gerente e casos especiais (João gerente e Sara vendedora com 2 e 3)
        {
          const regionais = extractUnique(demoData, 'regional');
          const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
          const pickRegional = (label: string) => (
            regionais.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
          );
          const un = (user?.username || '').toLowerCase();
          const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
          if ((user && user.role === 'gerente') || unNorm === 'sara') {
            const locked = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
              unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
            ];
            initialFilters.regional = locked;
            initialFilteredData = initialFilteredData.filter(item => locked.includes(item.regional));
          }
        }

        setActiveFilters(initialFilters);
        // Exceção: gerente João vê vendas do vendedor João
        const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
        const vendorsSelected = initialFilters.vendedor || undefined;
        const extraJoao = isJoaoGerente
          ? demoData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
          : [];
        const combined = Array.from(new Set([...initialFilteredData, ...extraJoao]));
        setFilteredData(combined);
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
    const match = (filterVal: string[] | undefined, candidate: string) => {
      if (!filterVal) return true;
      return filterVal.length === 0 ? true : filterVal.includes(candidate);
    };
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

      if (!match(activeFilters.cliente, item.nomeFantasia)) return false;
      if (!match(activeFilters.categoria, item.categoria)) return false;
      if (!match(activeFilters.regional, item.regional)) return false;
      if (!match(activeFilters.estado, item.uf)) return false;
      if (!match(activeFilters.cidade, item.cidade)) return false;
      if (!match(activeFilters.vendedor, item.vendedor)) return false;
      return true;
    });
    // Exceção João gerente
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
    const vendorsSelected = activeFilters.vendedor || undefined;
    const extraJoao = isJoaoGerente
      ? data.filter(i => {
          if (norm(i.vendedor) !== 'joao') return false;
          if (vendorsSelected && vendorsSelected.length > 0 && !vendorsSelected.includes(i.vendedor)) return false;
          const match = (filterVal: string[] | undefined, candidate: string) => {
            if (!filterVal) return true;
            return filterVal.length === 0 ? true : filterVal.includes(candidate);
          };
          if (!match(activeFilters.cliente, i.nomeFantasia)) return false;
          if (!match(activeFilters.categoria, i.categoria)) return false;
          if (!match(activeFilters.estado, i.uf)) return false;
          if (!match(activeFilters.cidade, i.cidade)) return false;
          return true;
        })
      : [];
    const combined = Array.from(new Set([...filtered, ...extraJoao]));
    setFilteredData(combined);
  };

  const handleClearFilters = () => {
    let clearedFilters: ActiveHistoryFilters | {} = {};

    if (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara') {
      clearedFilters = { vendedor: [user.vendedor] };
    }

    {
      const regionais = [...new Set(data.map(item => item.regional).filter(Boolean))] as string[];
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const pickRegional = (label: string) => (
        regionais.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        clearedFilters = { ...(clearedFilters as ActiveHistoryFilters), regional: wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ] };
      }
    }

    setActiveFilters(clearedFilters as ActiveHistoryFilters);

    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      const cf = clearedFilters as ActiveHistoryFilters;
      dataToShow = data.filter(item => {
        if (cf.vendedor && cf.vendedor.length > 0 && !cf.vendedor.includes(item.vendedor)) return false;
        if (cf.regional && cf.regional.length > 0 && !cf.regional.includes(item.regional)) return false;
        return true;
      });
    }

    // Exceção João gerente
    const norm2 = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isJoaoGerente2 = (user?.role === 'gerente' && norm2(user?.username || '') === 'joao');
    const vendorsSelected2 = (clearedFilters as ActiveHistoryFilters).vendedor || undefined;
    const extraJoao2 = isJoaoGerente2
      ? data.filter(i => norm2(i.vendedor) === 'joao' && (!vendorsSelected2 || vendorsSelected2.includes(i.vendedor)))
      : [];
    const combined2 = Array.from(new Set([...dataToShow, ...extraJoao2]));

    setFilteredData(combined2);

    const unTo = (user?.username || '').toLowerCase();
    const unToNorm = unTo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    toast({
      title: 'Filtros limpos',
      description: user?.role === 'vendedor' 
        ? 'Filtros limpos. Filtro de vendedor mantido.' 
        : (user?.role === 'gerente' || unToNorm === 'sara')
          ? (unToNorm === 'joao' || unToNorm === 'sara' ? 'Filtros limpos. Regionais 2 e 3 mantidas.' : (unToNorm === 'rodrigo' ? 'Filtros limpos. Regional 4 mantida.' : (unToNorm === 'sandro' ? 'Filtros limpos. Regional 1 mantida.' : 'Filtros limpos. Regional 3 mantida.')))
          : 'Mostrando todos os dados disponíveis.',
    });
  };

  const handleBackToPareto = () => {
    navigate('/pareto-clientes');
  };

  // Novo: calcular dias em campo a partir de dataPedido (DD/MM/YYYY)
  const computeDaysInField = (dateStr: string): number => {
    if (!dateStr) return 0;
    const [d, m, y] = dateStr.split('/');
    const start = new Date(parseInt(y || '0'), parseInt(m || '1') - 1, parseInt(d || '1'));
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };
  
  const getComparable = (item: DemoComodatosData, key: 'diasEmCampo' | keyof DemoComodatosData) => {
    if (key === 'diasEmCampo') {
      return computeDaysInField(item.dataPedido);
    }
    if (key === 'dataPedido') {
      const [d, m, y] = (item.dataPedido || '').split('/');
      return new Date(parseInt(y || '0'), parseInt(m || '1') - 1, parseInt(d || '1')).getTime();
    }
    if (key === 'quantidade' || key === 'valor') {
      return item[key] as number;
    }
    return String(item[key] || '').toLowerCase();
  };
  
  const handleSort = (key: 'diasEmCampo' | keyof DemoComodatosData) => {
    if (sortKey === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    const c = (category || '').toUpperCase();
    if (c === 'SB-300') return 'inline-block px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium';
    if (c === 'PILOTO') return 'inline-block px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium';
    return 'inline-block px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium';
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

  const searchedData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedData;
    return sortedData.filter(item => {
      const fields = [
        item.nomeFantasia || '',
        item.vendedor || '',
        item.cidade || ''
      ].map(s => s.toLowerCase());
      return fields.some(s => s.includes(term));
    });
  }, [sortedData, searchTerm]);

  const totalItems = searchedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pagedData = searchedData.slice(startIndex, endIndex);

  const totalPedidos = filteredData.length;
  const valorTotal = filteredData.reduce((sum, i) => sum + i.valor, 0);
  const ticketMedio = totalPedidos ? valorTotal / totalPedidos : 0;
  const regioesAtivas = new Set(filteredData.map(i => i.regional).filter(Boolean)).size;
  
  const handleOpenFilters = () => {
    const el = document.getElementById('history-filters-content');
    el?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleExport = () => {
    const header = ['Data', 'Cliente', 'Categoria', 'Vendedor', 'Localização', 'Dias em Campo', 'Quantidade', 'Valor'];
    const rows = searchedData.map(item => [
      item.dataPedido,
      item.nomeFantasia,
      item.categoria,
      item.vendedor,
      `${item.cidade} - ${item.uf}`,
      computeDaysInField(item.dataPedido),
      item.quantidade,
      item.valor.toFixed(2)
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demonstracoes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="text-xs uppercase text-muted-foreground">Total de Pedidos</div>
    <div className="text-2xl font-bold text-green-600">{totalPedidos}</div>
  </div>
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="text-xs uppercase text-muted-foreground">Valor Total</div>
    <div className="text-2xl font-bold text-blue-600">{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
  </div>
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="text-xs uppercase text-muted-foreground">Ticket Médio</div>
    <div className="text-2xl font-bold text-amber-600">{ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
  </div>
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="text-xs uppercase text-muted-foreground">Regiões Ativas</div>
    <div className="text-2xl font-bold text-violet-600">{regioesAtivas}</div>
  </div>
</div>

<div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold">Filtros</h2>
    <Button variant="ghost" size="sm" onClick={() => setFiltersCollapsed(c => !c)}>
      {filtersCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
      {filtersCollapsed ? 'Expandir' : 'Colapsar'}
    </Button>
  </div>
  {!filtersCollapsed && (
    <HistoryFilters 
      filterOptions={filterOptions} 
      activeFilters={activeFilters} 
      onFilterChange={setActiveFilters} 
      onApplyFilters={handleApplyFilters} 
      onClearFilters={handleClearFilters} 
      isLoading={isLoading}
    />
  )}
</div>

<div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
  <div className="flex items-center justify-between gap-2">
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar por cliente, vendedor ou cidade..."
      className="border rounded-md px-3 py-2 w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-green-500"
    />
    <ExportMenu
      data={sortedData}
      fileBaseName="demonst-comodatos"
      columns={[
        { label: 'Data', value: (i) => i.dataPedido },
        { label: 'Cliente', value: (i) => i.nomeFantasia },
        { label: 'Categoria', value: (i) => i.categoria },
        { label: 'Vendedor', value: (i) => i.vendedor },
        { label: 'Localização', value: (i) => `${i.cidade} - ${i.uf}` },
        { label: 'Qtde', value: (i) => i.quantidade },
        { label: 'Valor', value: (i) => i.valor.toFixed(2) },
      ] as ExportColumn<typeof sortedData[number]>[]}
    />
  </div>
</div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('dataPedido')}>
                  <div className="flex items-center gap-1">
                    <span>Data</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'dataPedido' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomeFantasia')}>
                  <div className="flex items-center gap-1">
                    <span>Cliente</span>
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
                    <span>Localização</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'cidade' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>

                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('diasEmCampo')}>
                  <div className="flex items-center gap-1">
                    <span>Dias em Campo</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'diasEmCampo' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('quantidade')}>
                  <div className="flex items-center gap-1">
                    <span>Qtde</span>
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
              {pagedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.dataPedido}</TableCell>
                  <TableCell><strong>{item.nomeFantasia}</strong></TableCell>
                  <TableCell><span className={getCategoryBadgeClass(item.categoria)}>{item.categoria}</span></TableCell>
                  <TableCell>{item.vendedor}</TableCell>
                  <TableCell>{`${item.cidade} - ${item.uf}`}</TableCell>
                  <TableCell>{computeDaysInField(item.dataPedido)}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                  <TableCell><span className="font-semibold text-green-600">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            <div className="flex justify-between items-center p-4 border-t text-sm text-muted-foreground">
              <div>Mostrando {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} de {totalItems} registros</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>← Anterior</Button>
                <Button variant="outline" disabled>{currentPage}</Button>
                <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Próximo →</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DemoComodatos;
