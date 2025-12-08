import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSheetsService, LeadData } from '@/services/googleSheetsService';
import { ArrowLeft, ArrowUpDown, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ExportMenu } from '@/components/ExportMenu';
import type { ExportColumn } from '@/utils/export';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

function getLeadStatus(lead: LeadData) {
  const raw = (lead.estadoNegociacao || '').toLowerCase();
  if (raw.includes('vendida')) {
    return { status: 'Vendida', color: '#16a34a', icon: '✅', className: 'bg-green-100 text-green-700' };
  } else if (raw.includes('perdida')) {
    return { status: 'Perdida', color: '#dc2626', icon: '❌', className: 'bg-red-100 text-red-700' };
  } else if (raw.includes('não fechadas') || raw.includes('em andamento')) {
    return { status: 'Em Andamento', color: '#f59e0b', icon: '⏳', className: 'bg-orange-100 text-orange-700' };
  }
  return { status: 'Indefinido', color: '#64748b', icon: '❓', className: 'bg-gray-100 text-gray-700' };
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const LeadsCRM: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<LeadData[]>([]);
  const [filteredData, setFilteredData] = useState<LeadData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortKey, setSortKey] = useState<keyof LeadData | 'valorUsado' | 'ticketMedio' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const [filterOptions, setFilterOptions] = useState<{ vendedores: string[]; status: string[]; ufs: string[]; produtos: string[]; equipes: string[]; empresas: string[]; regionais: string[] }>({ vendedores: [], status: [], ufs: [], produtos: [], equipes: [], empresas: [], regionais: [] });
  const [activeFilters, setActiveFilters] = useState<{ dataInicio?: string; dataFim?: string; vendedor?: string[]; status?: string[]; uf?: string[]; produto?: string[]; equipe?: string[]; empresa?: string[]; regional?: string[] }>({});
  const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const leads = await service.fetchLeadsData();

        // Extrair opções de vendedor e status (a partir da coluna K)
        const allVendedores = [...new Set(leads.map(l => l.vendedor).filter(Boolean))].sort();
        const normalize = (s: string) => {
          const k = (s || '').toLowerCase();
          if (k.includes('vendida')) return 'Vendida';
          if (k.includes('perdida')) return 'Perdida';
          if (k.includes('não fechadas') || k.includes('em andamento')) return 'Em Andamento';
          return 'Indefinido';
        };
        const statusValues = [...new Set(leads.map(l => normalize(l.estadoNegociacao)))].filter(Boolean);
        const ufValues = [...new Set(leads.map(l => l.uf).filter(Boolean))].sort();
        const produtoValues = [...new Set(leads.map(l => l.produto).filter(Boolean))].sort();
        const equipeValues = [...new Set(leads.map(l => l.equipe).filter(Boolean))].sort();
        const empresaValues = [...new Set(leads.map(l => l.empresa).filter(Boolean))].sort();
        const regionalValues = [...new Set(leads.map(l => l.regional).filter(Boolean))].sort();

        const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor ? [user.vendedor] : allVendedores;
        setFilterOptions({ vendedores: vendedoresOptions, status: statusValues, ufs: ufValues, produtos: produtoValues, equipes: equipeValues, empresas: empresaValues, regionais: regionalValues });

        // Aplicar filtro de vendedor automaticamente
        let initialFilters: { vendedor?: string; status?: string; dataInicio?: string; dataFim?: string; equipe?: string } = {};
        let initialData = leads;
        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters.vendedor = user.vendedor;
          initialData = leads.filter(l => l.vendedor === user.vendedor);
        }

        // Trava de equipe para o usuário Rodrigo
        const isRodrigo = user?.username?.toLowerCase() === 'rodrigo';
        if (isRodrigo) {
          const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[\-/]/g, '');
          const targetLabel = 'equiperodrigomsmtroac';
          const equipeValor = equipeValues.find(e => normalize(e) === targetLabel) || 'Equipe Rodrigo - MS/MT/RO/AC';
          initialFilters.equipe = equipeValor;
          initialData = initialData.filter(l => l.equipe === equipeValor);
        }

        // Trava de equipe para o usuário Sandro
        const isSandro = user?.username?.toLowerCase() === 'sandro';
        if (isSandro) {
          const normalize2 = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[\-/]/g, '');
          const targetLabelSandro = 'equipesandrosul';
          const equipeValorSandro = equipeValues.find(e => normalize2(e) === targetLabelSandro) || 'Equipe Sandro - Sul';
          initialFilters.equipe = equipeValorSandro;
          initialData = initialData.filter(l => l.equipe === equipeValorSandro);
        }

        // Trava de equipe para o usuário joao
        const isJoao = user?.username?.toLowerCase() === 'joao';
        if (isJoao) {
          const normalize3 = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[\-/]/g, '');
          const targetLabelJoao = 'equipepaulomggotoba';
          const equipeValorJoao = equipeValues.find(e => normalize3(e) === targetLabelJoao) || 'Equipe Paulo - MG/GO/TO/BA';
          initialFilters.equipe = equipeValorJoao;
          initialData = initialData.filter(l => l.equipe === equipeValorJoao);
        }

        setData(leads);
        setFilteredData(initialData);
        setActiveFilters({
          ...initialFilters,
          vendedor: initialFilters.vendedor ? [initialFilters.vendedor] : undefined,
          status: initialFilters.status ? [initialFilters.status] : undefined,
          equipe: initialFilters.equipe ? [initialFilters.equipe] : undefined,
        });
        setIsLoading(false);
        toast({ title: 'Dados carregados', description: `${initialData.length} leads carregados com sucesso.` });
      } catch (error) {
        console.error('Erro ao carregar leads', error);
        toast({ title: 'Erro', description: 'Não foi possível carregar os dados de leads.', variant: 'destructive' });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilters, filteredData.length]);

  const applyFilters = () => {
    const match = (vals?: string[], candidate?: string) => {
      if (!vals) return true;
      if (!candidate) return false;
      return vals.length === 0 ? true : vals.includes(candidate);
    };
    let result = data.filter(lead => {
      // Filtro por vendedor
      if (!match(activeFilters.vendedor, lead.vendedor)) return false;

      // Filtro por status
      if (activeFilters.status) {
        const s = getLeadStatus(lead).status;
        if (!match(activeFilters.status, s)) return false;
      }

      // Novos filtros: UF, Produto, Equipe, Empresa
      if (!match(activeFilters.uf, lead.uf)) return false;
      if (!match(activeFilters.produto, lead.produto)) return false;
      if (!match(activeFilters.equipe, lead.equipe)) return false;
      if (!match(activeFilters.empresa, lead.empresa)) return false;
      if (!match(activeFilters.regional, lead.regional)) return false;

      // Filtro por data (dataCriacao pode estar em DD/MM/YYYY)
      if (activeFilters.dataInicio || activeFilters.dataFim) {
        const [d, m, y] = (lead.dataCriacao || '').split('/');
        const itemDate = d && m && y ? new Date(parseInt(y), parseInt(m) - 1, parseInt(d)) : new Date(lead.dataCriacao);
        itemDate.setHours(0, 0, 0, 0);
        if (activeFilters.dataInicio) {
          const start = new Date(activeFilters.dataInicio);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (activeFilters.dataFim) {
          const end = new Date(activeFilters.dataFim);
          end.setHours(0, 0, 0, 0);
          if (itemDate > end) return false;
        }
      }

      // Busca global simples (nome/produto/empresa)
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        const hay = `${lead.nome} ${lead.produto} ${lead.empresa} ${lead.vendedor} ${lead.cidade}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }

      return true;
    });

    setFilteredData(result);
  };

  const clearFilters = () => {
    let cleared: { dataInicio?: string; dataFim?: string; vendedor?: string[]; status?: string[]; uf?: string[]; produto?: string[]; equipe?: string[]; empresa?: string[]; regional?: string[] } = {};
    if (user && user.role === 'vendedor' && user.vendedor) {
      cleared.vendedor = [user.vendedor];
    }
    const isRodrigo = user?.username?.toLowerCase() === 'rodrigo';
    if (isRodrigo) {
      // Manter a equipe travada para Rodrigo
      cleared.equipe = ['Equipe Rodrigo - MS/MT/RO/AC'];
    }
    const isSandro = user?.username?.toLowerCase() === 'sandro';
    if (isSandro) {
      // Manter a equipe travada para Sandro
      cleared.equipe = ['Equipe Sandro - Sul'];
    }
    const isJoao = user?.username?.toLowerCase() === 'joao';
    if (isJoao) {
      // Manter a equipe travada para joao
      cleared.equipe = ['Equipe Paulo - MG/GO/TO/BA'];
    }
    setActiveFilters(cleared);

    let result = data;
    if (cleared.vendedor && cleared.vendedor.length > 0) {
      result = data.filter(l => cleared.vendedor!.includes(l.vendedor));
    }
    if (cleared.equipe && cleared.equipe.length > 0) {
      result = result.filter(l => cleared.equipe!.includes(l.equipe));
    }
    setFilteredData(result);

    toast({ 
      title: 'Filtros limpos', 
      description: user?.role === 'vendedor' 
        ? 'Filtro de vendedor mantido.' 
        : isRodrigo 
          ? 'Filtros limpos. Equipe Rodrigo - MS/MT/RO/AC mantida.' 
          : isSandro
            ? 'Filtros limpos. Equipe Sandro - Sul mantida.'
            : isJoao
              ? 'Filtros limpos. Equipe Paulo - MG/GO/TO/BA mantida.'
              : 'Mostrando todos os leads.' 
    });
  };

  const handleSort = (key: keyof LeadData | 'valorUsado' | 'ticketMedio') => {
    const order = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(order);
  
    const sorted = [...filteredData].sort((a, b) => {
      let av: any = key === 'valorUsado' ? a.valorUsado : (a[key] as any);
      let bv: any = key === 'valorUsado' ? b.valorUsado : (b[key] as any);
  
      if (key === 'dataCriacao') {
        const [da, ma, ya] = (a.dataCriacao || '').split('/');
        const [db, mb, yb] = (b.dataCriacao || '').split('/');
        const ad = da && ma && ya ? new Date(parseInt(ya), parseInt(ma) - 1, parseInt(da)).getTime() : new Date(a.dataCriacao).getTime();
        const bd = db && mb && yb ? new Date(parseInt(yb), parseInt(mb) - 1, parseInt(db)).getTime() : new Date(b.dataCriacao).getTime();
        av = ad;
        bv = bd;
      }
  
      if (typeof av === 'string' && typeof bv === 'string') {
        return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return order === 'asc' ? (av - bv) : (bv - av);
    });
  
    setFilteredData(sorted);
  };

  const metrics = useMemo(() => {
  const total = filteredData.length;
  const norm = (s: string) => {
    const k = (s || '').toLowerCase();
    if (k.includes('vendida')) return 'Vendida';
    if (k.includes('perdida')) return 'Perdida';
    if (k.includes('não fechadas') || k.includes('em andamento')) return 'Em Andamento';
    return 'Indefinido';
  };
  const convertidos = filteredData.filter(l => norm(l.estadoNegociacao) === 'Vendida').length;
  const perdidos = filteredData.filter(l => norm(l.estadoNegociacao) === 'Perdida').length;
  const andamento = filteredData.filter(l => norm(l.estadoNegociacao) === 'Em Andamento').length;
  const taxa = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0.0';
  
  // Custo por Lead (média de valorUsado em leads com custo informado)
  const leadsComCusto = filteredData.filter(l => (l.valorUsado || 0) > 0);
  const custoPorLead = leadsComCusto.length > 0 ? (leadsComCusto.reduce((acc, l) => acc + (l.valorUsado || 0), 0) / leadsComCusto.length) : 0;
  
  // Ticket Médio do Produto (mantido)
  // Ticket Médio: considerar APENAS leads convertidos (status "Vendida" na coluna K)
  // Soma dos tickets médios dos convertidos / quantidade de convertidos
  const leadsConvertidos = filteredData.filter(l => norm(l.estadoNegociacao) === 'Vendida');
  const somaTicketMedioConvertidos = leadsConvertidos.reduce((acc, l) => acc + (l.ticketMedio || 0), 0);
  const ticketMedioProduto = leadsConvertidos.length > 0 ? (somaTicketMedioConvertidos / leadsConvertidos.length) : 0;

  // Valor Investido (soma de valorUsado)
  const valorInvestido = filteredData.reduce((acc, l) => acc + (l.valorUsado || 0), 0);
  
  // CAC - Custo de Aquisição de Cliente (total investido / total convertido)
  const cac = convertidos > 0 ? valorInvestido / convertidos : 0;

  // Receita Aproximada (total convertido × ticket médio)
  const receitaAproximada = convertidos * ticketMedioProduto;
  
  return { total, convertidos, perdidos, andamento, taxa, custoPorLead, ticketMedioProduto, valorInvestido, cac, receitaAproximada };
  }, [filteredData]);

  const vendedorOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.vendedores.map(v => ({ value: v, label: v }))];
  const statusOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.status.map(s => ({ value: s, label: s }))];
  const ufOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.ufs.map(u => ({ value: u, label: u }))];
  const produtoOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.produtos.map(p => ({ value: p, label: p }))];
  const equipeOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.equipes.map(e => ({ value: e, label: e }))];
  const empresaOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.empresas.map(e => ({ value: e, label: e }))];
  const regionalOptions: ComboboxOption[] = [{ value: '__ALL__', label: 'Todos' }, ...filterOptions.regionais.map(r => ({ value: r, label: r }))];

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f7fa' }}>
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Button variant="ghost" onClick={() => navigate(-1)} className="p-0 h-auto text-slate-600 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /></Button>
          <span>Home</span>
          <span>/</span>
          <span>CRM</span>
          <span>/</span>
          <span className="font-semibold" style={{ color: '#1e293b' }}>Gestão de Leads</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1e293b' }}>Gestão de Leads CRM</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Acompanhe KPIs, filtros e dados detalhados dos leads.</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Total de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{metrics.total}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Convertidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>{metrics.convertidos}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Perdidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#dc2626' }}>{metrics.perdidos}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{metrics.andamento}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{metrics.taxa}%</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Custo por Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{formatCurrency(metrics.custoPorLead)}</div>
            </CardContent>
          </Card>
          {/* Valor Investido - ocupa duas colunas */}
          <Card className="rounded-xl shadow-sm border md:col-span-2" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Valor Investido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{formatCurrency(metrics.valorInvestido)}</div>
            </CardContent>
          </Card>
          {/* Ticket Médio - coluna O */}
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#2563eb' }}>{formatCurrency(metrics.ticketMedioProduto)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>CAC (Custo por Venda)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{formatCurrency(metrics.cac)}</div>
            </CardContent>
          </Card>
          {/* Receita Aproximada (convertidos × ticket médio) */}
          <Card className="rounded-xl shadow-sm border md:col-span-2" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: '#64748b' }}>Receita Aproximada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(metrics.receitaAproximada)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-4" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1e293b' }}>Filtros</h2>
            <Button variant="ghost" size="sm" onClick={() => setFiltersCollapsed(c => !c)} className="text-slate-600 hover:text-slate-800">
              {filtersCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
              {filtersCollapsed ? 'Expandir' : 'Colapsar'}
            </Button>
          </div>
          {!filtersCollapsed && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Data início</label>
                  <Input type="date" value={activeFilters.dataInicio || ''} onChange={(e) => setActiveFilters({ ...activeFilters, dataInicio: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Data fim</label>
                  <Input type="date" value={activeFilters.dataFim || ''} onChange={(e) => setActiveFilters({ ...activeFilters, dataFim: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Vendedor</label>
                  <Combobox
                    multiple
                    options={vendedorOptions}
                    values={activeFilters.vendedor || []}
                    onChangeValues={(values) => setActiveFilters({ ...activeFilters, vendedor: values && values.length > 0 ? values : undefined })}
                    placeholder="Selecionar vendedor"
                    searchPlaceholder="Pesquisar..."
                    noResultsMessage="Nenhum resultado encontrado."
                    disabled={user?.role === 'vendedor'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Status</label>
                  <Combobox
                    multiple
                    options={statusOptions}
                    values={activeFilters.status || []}
                    onChangeValues={(values) => setActiveFilters({ ...activeFilters, status: values && values.length > 0 ? values : undefined })}
                    placeholder="Selecionar status"
                    searchPlaceholder="Pesquisar..."
                    noResultsMessage="Nenhum resultado encontrado."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>UF</label>
                  <Combobox
                    multiple
                    options={ufOptions}
                    values={activeFilters.uf || []}
                    onChangeValues={(values) => setActiveFilters({ ...activeFilters, uf: values && values.length > 0 ? values : undefined })}
                    placeholder="Selecionar UF"
                    searchPlaceholder="Pesquisar..."
                    noResultsMessage="Nenhum resultado encontrado."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Produto</label>
                  <Combobox
                    multiple
                    options={produtoOptions}
                    values={activeFilters.produto || []}
                    onChangeValues={(values) => setActiveFilters({ ...activeFilters, produto: values && values.length > 0 ? values : undefined })}
                    placeholder="Selecionar produto"
                    searchPlaceholder="Pesquisar..."
                    noResultsMessage="Nenhum resultado encontrado."
                  />
                </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Equipes</label>
                <Combobox
                  multiple
                  options={equipeOptions}
                  values={activeFilters.equipe || []}
                  onChangeValues={(values) => setActiveFilters({ ...activeFilters, equipe: values && values.length > 0 ? values : undefined })}
                  placeholder="Selecionar equipe"
                  searchPlaceholder="Pesquisar..."
                  noResultsMessage="Nenhum resultado encontrado."
                  disabled={['rodrigo','sandro','joao'].includes(user?.username?.toLowerCase() || '')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Regional</label>
                <Combobox
                  multiple
                  options={regionalOptions}
                  values={activeFilters.regional || []}
                  onChangeValues={(values) => setActiveFilters({ ...activeFilters, regional: values && values.length > 0 ? values : undefined })}
                  placeholder="Selecionar regional"
                  searchPlaceholder="Pesquisar..."
                  noResultsMessage="Nenhum resultado encontrado."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#64748b' }}>Empresa</label>
                <Combobox
                  multiple
                  options={empresaOptions}
                  values={activeFilters.empresa || []}
                  onChangeValues={(values) => setActiveFilters({ ...activeFilters, empresa: values && values.length > 0 ? values : undefined })}
                  placeholder="Selecionar empresa"
                  searchPlaceholder="Pesquisar..."
                  noResultsMessage="Nenhum resultado encontrado."
                />
              </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={applyFilters}>Aplicar Filtros</Button>
                <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
                <div className="ml-auto flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <Input placeholder="Buscar por nome, empresa, cidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <div className="p-4 flex items-center justify-between border-b">
            <h2 className="text-lg font-semibold" style={{ color: '#1e293b' }}>Leads</h2>
            <div className="flex items-center gap-3">
              <div className="text-sm" style={{ color: '#64748b' }}>Total: {filteredData.length}</div>
              <ExportMenu
                data={filteredData}
                fileBaseName="leads-crm"
                columns={[
                  { label: 'Nome', value: (l) => l.nome },
                  { label: 'Produto', value: (l) => l.produto },
                  { label: 'Empresa', value: (l) => l.empresa },
                  { label: 'Vendedor', value: (l) => l.vendedor },
                  { label: 'Regional', value: (l) => l.regional },
                  { label: 'Etapa do Funil', value: (l) => l.etapaFunil },
                  { label: 'Status', value: (l) => l.estadoNegociacao },
                  { label: 'Ticket Médio', value: (l) => (l.ticketMedio || 0).toFixed(2) },
                  { label: 'Custo', value: (l) => (l.valorUsado || 0).toFixed(2) },
                  { label: 'Data', value: (l) => l.dataCriacao },
                  { label: 'UF', value: (l) => l.uf },
                  { label: 'Cidade', value: (l) => l.cidade },
                  { label: 'Fonte', value: (l) => l.fonte },
                  { label: 'Campanha', value: (l) => l.campanha },
                  { label: 'Valor Campanha', value: (l) => (l.valorCampanha || 0).toFixed(2) },
                  { label: 'Valor Usado', value: (l) => (l.valorUsado || 0).toFixed(2) },
                  { label: 'Qualificação', value: (l) => l.qualificacao },
                  { label: 'Anotações', value: (l) => l.anotacoes || '' },
                ] as ExportColumn<LeadData>[]}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-4">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Etapa do Funil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('ticketMedio')}>
                      <div className="flex items-center gap-1"><span>Ticket Médio</span><ArrowUpDown className="h-3 w-3 opacity-60" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('valorUsado')}>
                      <div className="flex items-center gap-1"><span>Custo</span><ArrowUpDown className="h-3 w-3 opacity-60" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('dataCriacao')}>
                      <div className="flex items-center gap-1"><span>Data</span><ArrowUpDown className="h-3 w-3 opacity-60" /></div>
                    </TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((lead, idx) => {
                    const status = getLeadStatus(lead);
                    return (
                      <TableRow key={`${lead.nome}-${idx}`}>
                        <TableCell>{lead.nome}</TableCell>
                        <TableCell>{lead.produto}</TableCell>
                        <TableCell>{lead.empresa}</TableCell>
                        <TableCell>{lead.vendedor}</TableCell>
                        <TableCell>{lead.etapaFunil}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${status.className}`}>
                            <span>{status.icon}</span>
                            <span>{status.status}</span>
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(lead.ticketMedio || 0)}</TableCell>
                        <TableCell>{formatCurrency(lead.valorUsado || 0)}</TableCell>
                        <TableCell>{lead.dataCriacao}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline">Ver detalhes</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Lead</DialogTitle>
                                <DialogDescription>Informações completas do lead selecionado.</DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p><strong>Nome:</strong> {lead.nome}</p>
                                  <p><strong>Produto:</strong> {lead.produto}</p>
                                  <p><strong>Empresa:</strong> {lead.empresa}</p>
                                  <p><strong>Vendedor:</strong> {lead.vendedor}</p>
                                </div>
                                <div>
                                  <p><strong>UF:</strong> {lead.uf}</p>
                                  <p><strong>Cidade:</strong> {lead.cidade}</p>
                                  <p><strong>Data de Criação:</strong> {lead.dataCriacao}</p>
                                </div>
                                <div>
                                  <p><strong>Etapa do Funil:</strong> {lead.etapaFunil}</p>
                                  <p><strong>Status:</strong> {getLeadStatus(lead).status}</p>
                                  <p><strong>Ticket Médio:</strong> {formatCurrency(lead.ticketMedio || 0)}</p>
                                  <p><strong>Custo:</strong> {formatCurrency(lead.valorUsado || 0)}</p>
                                </div>
                                <div>
                                  <p><strong>Fonte:</strong> {lead.fonte}</p>
                                  <p><strong>Campanha:</strong> {lead.campanha}</p>
                                  <p><strong>Valor da Campanha:</strong> {formatCurrency(lead.valorCampanha || 0)}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p><strong>Anotações:</strong> {lead.anotacoes}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 flex items-center justify-between border-t">
            <div className="text-sm" style={{ color: '#64748b' }}>Página {currentPage} de {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</Button>
              <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsCRM;
