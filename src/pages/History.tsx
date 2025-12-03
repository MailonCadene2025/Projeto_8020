import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { HistoryFilters } from '@/components/HistoryFilters';
import type { FilterOptions as HistoryFilterOptions, ActiveFilters as BaseActiveFilters } from '@/components/HistoryFilters';
import { GoogleSheetsService, HistoryData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
  import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp, Eye } from 'lucide-react';
  import { ExportMenu } from '@/components/ExportMenu';
  import type { ExportColumn } from '@/utils/export';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

type ActiveHistoryFilters = BaseActiveFilters & { dataInicio?: string; dataFim?: string };

const History = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<HistoryData[]>([]);
  const [filteredData, setFilteredData] = useState<HistoryData[]>([]);
  type SortableHistoryKey = keyof HistoryData | 'valorUnitario';
  const [sortKey, setSortKey] = useState<SortableHistoryKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ cliente: [], categoria: [], regional: [], estado: [], cidade: [], vendedor: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveHistoryFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [selectedSale, setSelectedSale] = useState<HistoryData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();
  const [clienteTipoMap, setClienteTipoMap] = useState<Record<string, string>>({});

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const kpi = useMemo(() => {
    const source = filteredData.length > 0 ? filteredData : data;
    const receitaTotal = source.reduce((sum, item) => sum + (item.valor || 0), 0);
    const nfSet = new Set<string>();
    source.forEach(item => {
      const nf = (item.nf || '').trim();
      if (nf) nfSet.add(nf);
    });
    const totalPedidos = nfSet.size;
    const ticketMedio = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;

    const vendedorMap = new Map<string, { receita: number; pedidos: Set<string> }>();
    source.forEach(item => {
      const vend = (item.vendedor || '').trim() || '—';
      const nf = (item.nf || '').trim();
      if (!vendedorMap.has(vend)) vendedorMap.set(vend, { receita: 0, pedidos: new Set() });
      const entry = vendedorMap.get(vend)!;
      entry.receita += item.valor || 0;
      if (nf) entry.pedidos.add(nf);
    });
    let topVendedor = '—';
    let topVendedorReceita = 0;
    let topVendedorPedidos = 0;
    for (const [vend, { receita, pedidos }] of vendedorMap.entries()) {
      if (receita > topVendedorReceita) {
        topVendedorReceita = receita;
        topVendedorPedidos = pedidos.size;
        topVendedor = vend;
      }
    }

    return { receitaTotal, totalPedidos, ticketMedio, topVendedor, topVendedorReceita, topVendedorPedidos };
  }, [data, filteredData]);

  // Obter cliente pré-selecionado do state da navegação
  const prefilledClient = location.state?.prefilledClient;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const historyData = await service.fetchHistoryData();
        const vendas = await service.fetchData();
        setData(historyData);
        
        // Extract filter options, filtering out empty values
        const extractUnique = (data: HistoryData[], key: keyof HistoryData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        // Filtrar opções de vendedores baseado no papel do usuário
        const allVendedores = extractUnique(historyData, 'vendedor').sort();
        const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && user.username.toLowerCase() !== 'sara')
          ? [user.vendedor] // Se for vendedor (exceto Sara), mostrar apenas seu próprio nome
          : allVendedores;   // Admin e Sara veem todos

        // Mapear Tipo de Cliente por nome a partir de VENDAS
        const tipoMap: Record<string, string> = {};
        vendas.forEach(v => {
          const nome = (v.nomeFantasia || '').trim();
          const tipo = (v.tipoCliente || '').trim();
          if (nome && tipo && !tipoMap[nome]) tipoMap[nome] = tipo;
        });
        setClienteTipoMap(tipoMap);

        const tiposCliente = [...new Set(vendas.map(v => (v.tipoCliente || '').trim()).filter(Boolean))].sort();

        setFilterOptions({
          cliente: extractUnique(historyData, 'nomeFantasia').sort(),
          categoria: extractUnique(historyData, 'categoria').sort(),
          regional: extractUnique(historyData, 'regional').sort(),
          estado: extractUnique(historyData, 'uf').sort(),
          cidade: extractUnique(historyData, 'cidade').sort(),
          vendedor: vendedoresOptions,
          tiposCliente,
        });

        // Aplicar filtros automáticos
        let initialFilteredData = historyData;
        let initialFilters: ActiveHistoryFilters = {};
        
        // Filtro automático para vendedor
        if (user && user.role === 'vendedor' && user.vendedor && user.username.toLowerCase() !== 'sara') {
          initialFilters.vendedor = [user.vendedor];
          initialFilteredData = initialFilteredData.filter(item => item.vendedor === user.vendedor);
        }

        // Trava de regional: gerente e casos especiais (João gerente e Sara vendedora com 2 e 3)
        {
          const regionaisOpts = extractUnique(historyData, 'regional').sort();
          const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
          const un = (user?.username || '').toLowerCase();
          const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const pickRegional = (label: string) => (
            regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
          );
          const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
          if ((user && user.role === 'gerente') || unNorm === 'sara') {
            const locked = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
              unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
            ];
            initialFilters.regional = locked;
            initialFilteredData = initialFilteredData.filter(item => locked.includes(item.regional));
            // Exceção: gerente João vê vendas do vendedor João
            const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
            const vendorsSelected = initialFilters.vendedor || undefined;
            const extraJoao = isJoaoGerente
              ? historyData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
              : [];
            initialFilteredData = Array.from(new Set([...initialFilteredData, ...extraJoao]));
          }
        }

        // Filtro automático para cliente pré-selecionado
        if (prefilledClient) {
          initialFilters.cliente = [prefilledClient];
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
    const match = (filterVal: string[] | undefined, candidate: string) => {
      if (!filterVal) return true
      return filterVal.length === 0 ? true : filterVal.includes(candidate)
    }
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

      if (!match(activeFilters.cliente, item.nomeFantasia)) return false;
      if (!match(activeFilters.categoria, item.categoria)) return false;
      if (!match(activeFilters.regional, item.regional)) return false;
      if (!match(activeFilters.estado, item.uf)) return false;
      if (!match(activeFilters.cidade, item.cidade)) return false;
      if (!match(activeFilters.vendedor, item.vendedor)) return false;
      // Tipo de Cliente (derivado de VENDAS por nome do cliente)
      if (activeFilters.tipoCliente && activeFilters.tipoCliente.length > 0) {
        const tipo = clienteTipoMap[(item.nomeFantasia || '').trim()];
        if (!tipo || !activeFilters.tipoCliente.includes(tipo)) return false;
      }
      return true;
    });
    // Exceção João gerente: unir vendas do vendedor João respeitando filtro de vendedor (se houver)
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
    const vendorsSelected = activeFilters.vendedor || undefined;
    const extraJoao = isJoaoGerente
      ? data.filter(i => {
          if (norm(i.vendedor) !== 'joao') return false;
          // Respeita filtro de vendedor se definido
          if (vendorsSelected && vendorsSelected.length > 0 && !vendorsSelected.includes(i.vendedor)) return false;
          // Reaplica demais filtros (exceto regional)
          const match = (filterVal: string[] | undefined, candidate: string) => {
            if (!filterVal) return true;
            return filterVal.length === 0 ? true : filterVal.includes(candidate);
          };
          if (activeFilters.dataInicio) {
            const itemDate = new Date(i.dataPedido.split('/').reverse().join('-'));
            itemDate.setHours(0,0,0,0);
            const startDate = new Date(activeFilters.dataInicio);
            startDate.setHours(0,0,0,0);
            if (itemDate < startDate) return false;
          }
          if (activeFilters.dataFim) {
            const itemDate = new Date(i.dataPedido.split('/').reverse().join('-'));
            itemDate.setHours(0,0,0,0);
            const endDate = new Date(activeFilters.dataFim);
            endDate.setHours(0,0,0,0);
            if (itemDate > endDate) return false;
          }
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
    
    // Se o usuário for vendedor, manter o filtro de vendedor
    if (user && user.role === 'vendedor' && user.vendedor && user.username.toLowerCase() !== 'sara') {
      clearedFilters = { vendedor: [ user.vendedor ] };
    }
    
    // Se o usuário for gerente, manter regional travada (Rodrigo: Regional 4; outros: Regional 3)
    {
      const regionaisOpts = [...new Set(data.map(item => item.regional).filter(Boolean))] as string[];
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const pickRegional = (label: string) => (
        regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        (clearedFilters as ActiveHistoryFilters).regional = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ];
      }
    }
    
    setActiveFilters(clearedFilters as ActiveHistoryFilters);
    
    // Aplicar os filtros (se houver) aos dados
    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      const cf = clearedFilters as ActiveHistoryFilters
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
    
    const un = (user?.username || '').toLowerCase();
    const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    toast({
      title: "Filtros limpos",
      description: user?.role === 'vendedor' 
        ? "Filtros limpos. Filtro de vendedor mantido."
        : (user?.role === 'gerente' || unNorm === 'sara') 
          ? (unNorm === 'joao' || unNorm === 'sara' ? "Filtros limpos. Regionais 2 e 3 mantidas." : (unNorm === 'rodrigo' ? "Filtros limpos. Regional 4 mantida." : (unNorm === 'sandro' ? "Filtros limpos. Regional 1 mantida." : "Filtros limpos. Regional 3 mantida.")))
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
          <p className="text-sm text-slate-500">Central de Inteligência Comercial - Terris</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <Card className="rounded-xl shadow-sm border border-l-4" style={{ borderLeftColor: '#059669' }}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{formatCurrency(kpi.receitaTotal)}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border border-l-4" style={{ borderLeftColor: '#2563eb' }}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">Total de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{kpi.totalPedidos}</div>
              {(activeFilters.dataInicio || activeFilters.dataFim) ? (
                <div className="text-xs text-slate-500 mt-1">Período selecionado</div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border border-l-4" style={{ borderLeftColor: '#8b5cf6' }}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{formatCurrency(kpi.ticketMedio)}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm border border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">Top Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{kpi.topVendedor}</div>
              <div className="text-sm text-slate-600">{kpi.topVendedorPedidos} vendas - {formatCurrency(kpi.topVendedorReceita)}</div>
            </CardContent>
          </Card>
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
        
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Registros: {sortedData.length}</div>
            <ExportMenu
              data={sortedData}
              fileBaseName="historico-vendas"
              columns={[
                { label: 'Data Pedido', value: (i) => i.dataPedido },
                { label: 'Nome Fantasia', value: (i) => i.nomeFantasia },
                { label: 'UF', value: (i) => i.uf },
                { label: 'Categoria', value: (i) => i.categoria },
                { label: 'Forma de Pagamento', value: (i) => i.formaPagamento },
                { label: 'NF', value: (i) => i.nf },
                { label: 'Vendedor', value: (i) => i.vendedor },
                { label: 'Quantidade', value: (i) => i.quantidade },
                { label: 'Valor Unitário', value: (i) => ((i.quantidade ? i.valor / i.quantidade : 0).toFixed(2)) },
                { label: 'Valor', value: (i) => i.valor.toFixed(2) },
              ] as ExportColumn<typeof sortedData[number]>[]}
            />
          </div>
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('uf')}>
                  <div className="flex items-center gap-1">
                    <span>Local</span>
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
                    <span>NF</span>
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
                <TableHead className="text-right">
                  <span>Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium">
                    {item.dataPedido}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-800">{item.nomeFantasia}</span>
                      <span className="text-xs text-slate-500">{item.cidade}{item.uf ? `, ${item.uf}` : ''}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.uf ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0 rounded-md text-xs font-semibold">{item.uf}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {item.categoria ? (
                      <Badge className="bg-purple-100 text-purple-700 border-0 rounded-md text-xs font-semibold">{item.categoria}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="py-4">{item.formaPagamento}</TableCell>
                  <TableCell className="py-4">{item.nf}</TableCell>
                  <TableCell className="py-4">{item.vendedor}</TableCell>
                  <TableCell className="text-right py-4">{item.quantidade}</TableCell>
                  <TableCell className="text-right py-4">{(item.quantidade ? item.valor / item.quantidade : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600 py-4">{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className="text-right py-4">
                    <Button variant="outline" size="sm" className="px-2" onClick={() => { setSelectedSale(item); setIsDetailsOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

            {/* Modal de Detalhes da Venda */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Detalhes da Venda</DialogTitle>
                  <DialogDescription>Informações do pedido selecionado.</DialogDescription>
                </DialogHeader>
                {selectedSale && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Data</div>
                      <div className="font-medium">{selectedSale.dataPedido}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">NF</div>
                      <div className="font-medium">{selectedSale.nf}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-500">Cliente</div>
                      <div className="font-medium">{selectedSale.nomeFantasia}</div>
                      <div className="text-xs text-slate-500">{selectedSale.cidade} - {selectedSale.uf}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Categoria</div>
                      <div className="font-medium">{selectedSale.categoria}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Vendedor</div>
                      <div className="font-medium">{selectedSale.vendedor}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Regional</div>
                      <div className="font-medium">{selectedSale.regional}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Forma Pgto</div>
                      <div className="font-medium">{selectedSale.formaPagamento}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Qtd</div>
                      <div className="font-medium">{selectedSale.quantidade}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Valor Unit.</div>
                      <div className="font-medium">{formatCurrency(selectedSale.quantidade ? selectedSale.valor / selectedSale.quantidade : 0)}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="text-lg font-semibold text-green-600">{formatCurrency(selectedSale.valor)}</div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </>
          )}
        </div>
      </div>
    );
  };
  
  export default History;
