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
        setData(historyData);
        
        // Extract filter options, filtering out empty values
        const extractUnique = (data: HistoryData[], key: keyof HistoryData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        // Filtrar opções de vendedores baseado no papel do usuário
        const allVendedores = extractUnique(historyData, 'vendedor').sort();
        const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor 
          ? [user.vendedor] // Se for vendedor, mostrar apenas seu próprio nome
          : allVendedores;   // Se for admin, mostrar todos

        setFilterOptions({
          cliente: extractUnique(historyData, 'nomeFantasia').sort(),
          categoria: extractUnique(historyData, 'categoria').sort(),
          regional: extractUnique(historyData, 'regional').sort(),
          estado: extractUnique(historyData, 'uf').sort(),
          cidade: extractUnique(historyData, 'cidade').sort(),
          vendedor: vendedoresOptions,
        });

        // Aplicar filtros automáticos
        let initialFilteredData = historyData;
        let initialFilters: ActiveHistoryFilters = {};
        
        // Filtro automático para vendedor
        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters.vendedor = user.vendedor;
          initialFilteredData = initialFilteredData.filter(item => item.vendedor === user.vendedor);
        }

        // Trava de regional para gerente (regional 3)
        if (user && user.role === 'gerente') {
          const regionaisOpts = extractUnique(historyData, 'regional').sort();
          const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
          const regional3Value = regionaisOpts.find(r => normalize(r) === 'regional3' || normalize(r) === 'regiao3' || r === '3');
          if (regional3Value) {
            initialFilters.regional = regional3Value;
            initialFilteredData = initialFilteredData.filter(item => item.regional === regional3Value);
          }
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
    let clearedFilters: ActiveHistoryFilters | {} = {};
    
    // Se o usuário for vendedor, manter o filtro de vendedor
    if (user && user.role === 'vendedor' && user.vendedor) {
      clearedFilters = { vendedor: user.vendedor };
    }
    
    // Se o usuário for gerente, manter regional 3
    if (user && user.role === 'gerente') {
      const regionaisOpts = [...new Set(data.map(item => item.regional).filter(Boolean))] as string[];
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
      const regional3Value = regionaisOpts.find(r => normalize(r) === 'regional3' || normalize(r) === 'regiao3' || r === '3');
      if (regional3Value) {
        (clearedFilters as ActiveHistoryFilters).regional = regional3Value;
      }
    }
    
    setActiveFilters(clearedFilters as ActiveHistoryFilters);
    
    // Aplicar os filtros (se houver) aos dados
    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      dataToShow = data.filter(item => {
        if ('vendedor' in (clearedFilters as { vendedor?: string }) && item.vendedor !== (clearedFilters as { vendedor?: string }).vendedor) return false;
        if ('regional' in (clearedFilters as { regional?: string }) && item.regional !== (clearedFilters as { regional?: string }).regional) return false;
        return true;
      });
    }
    
    setFilteredData(dataToShow);
    
    toast({
      title: "Filtros limpos",
      description: user?.role === 'vendedor' 
        ? "Filtros limpos. Filtro de vendedor mantido."
        : user?.role === 'gerente' 
          ? "Filtros limpos. Regional 3 mantida."
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
          <p className="text-sm text-slate-500">Central de Inteligência Comercial - Tetris</p>
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