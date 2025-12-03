import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { GoogleSheetsService, HistoryData } from '@/services/googleSheetsService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HistoryFilters, type FilterOptions as HistoryFilterOptions, type ActiveFilters as BaseActiveFilters } from '@/components/HistoryFilters';
import { ExportMenu } from '@/components/ExportMenu';
import type { ExportColumn } from '@/utils/export';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

interface ClienteResumo {
  nomeFantasia: string;
  ultimaCompra: Date | null;
  diasSemComprar: number;
  pedidos12m: number;
  faturamento12m: number;
  mediaIntervaloDias: number;
  // RFV
  scoreRecencia?: number;
  scoreFrequencia?: number;
  scoreValor?: number;
  scoreRFV?: string;
  segmento?: string;
  // Métricas adicionais
  ticketMedio?: number;
  faturamento6m?: number;
  faturamento6mAnterior?: number;
  tendencia?: '📈 CRESCENDO' | '📉 DECLINANDO' | '➡️ ESTÁVEL';
  statusVisual?: '🟢' | '🟡' | '🔴';
  acaoRecomendada?: string;
  prioridade?: 'ALTA' | 'MÉDIA' | 'BAIXA';
}

const RecenciaRecorrencia: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [raw, setRaw] = useState<HistoryData[]>([]);
  const [filteredRaw, setFilteredRaw] = useState<HistoryData[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ClienteResumo>('prioridade');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ cliente: [], categoria: [], regional: [], estado: [], cidade: [], vendedor: [] });
  type ActiveRecenciaFilters = BaseActiveFilters;
  const [activeFilters, setActiveFilters] = useState<ActiveRecenciaFilters>({});
  const [clienteTipoMap, setClienteTipoMap] = useState<Record<string, string>>({});
  // Filtros RFV adicionais
  const [filterSegmento, setFilterSegmento] = useState<string[]>([]);
  const [filterPrioridade, setFilterPrioridade] = useState<string[]>([]);
  const [filterTendencia, setFilterTendencia] = useState<string[]>([]);
  const [scoreMin, setScoreMin] = useState<string>('111');
  const [scoreMax, setScoreMax] = useState<string>('555');
  const [showHelpCard, setShowHelpCard] = useState(false);
  const [isClosingHelp, setIsClosingHelp] = useState(false);
  const helpContainerRef = useRef<HTMLDivElement | null>(null);
  const rfvRef = useRef<HTMLDivElement | null>(null);
  const segmentosRef = useRef<HTMLDivElement | null>(null);
  const coresRef = useRef<HTMLDivElement | null>(null);
  const filtrosRef = useRef<HTMLDivElement | null>(null);
  const acoesRef = useRef<HTMLDivElement | null>(null);

  const closeHelpWithAnimation = () => {
    if (!showHelpCard) return;
    setIsClosingHelp(true);
    setTimeout(() => {
      setShowHelpCard(false);
      setIsClosingHelp(false);
    }, 200);
  };

  useEffect(() => {
    if (!showHelpCard) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeHelpWithAnimation();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    // animação de entrada
    const t = setTimeout(() => setIsClosingHelp(false), 10);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(t);
    };
  }, [showHelpCard]);

  // Helpers
  const parseBRDate = (d: string): Date | null => {
    if (!d) return null;
    const [day, month, year] = d.split('/').map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const data = await service.fetchHistoryData();
        const vendas = await service.fetchData();

        // Aplicar travas iniciais como nas demais páginas
        let base = data;
        const un = (user?.username || '').toLowerCase();

        if (user && user.role === 'vendedor' && user.vendedor && un !== 'sara') {
          base = base.filter(i => i.vendedor === user.vendedor);
        }

        // regional lock
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
        const regionais = [...new Set(data.map(i => i.regional).filter(Boolean))] as string[];
        const pickRegional = (label: string) => (
          regionais.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
        );
        const wantsTwoThree = un === 'joao' || un === 'sara';
        if ((user && user.role === 'gerente') || un === 'sara') {
          const allowed = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
            un === 'rodrigo' ? pickRegional('4') : (un === 'sandro' ? pickRegional('1') : pickRegional('3'))
          ];
          base = base.filter(i => allowed.includes(i.regional));

          // Exceção: João gerente sempre vê vendas do vendedor João
          if (un === 'joao') {
            const joaoItens = data.filter(i => (i.vendedor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .toLowerCase() === 'joao');
            const setKey = (x: HistoryData) => `${x.dataPedido}|${x.nf}|${x.nomeFantasia}|${x.valor}`;
            const existing = new Set(base.map(setKey));
            const merged = [...base];
            joaoItens.forEach(x => { const k = setKey(x); if (!existing.has(k)) merged.push(x); });
            base = merged;
          }
        }

        setRaw(base);

        // construir opções de filtro
        const extractUnique = (arr: HistoryData[], key: keyof HistoryData) => [...new Set(arr.map(i => i[key]).filter(Boolean))] as string[];
        const allVendedores = extractUnique(base, 'vendedor').sort();
        const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && un !== 'sara') ? [user.vendedor] : allVendedores;
        // map de tipoCliente por cliente a partir de VENDAS
        const tipoMap: Record<string, string> = {};
        vendas.forEach(v => {
          const nome = (v.nomeFantasia || '').trim();
          const tipo = (v.tipoCliente || '').trim();
          if (nome && tipo && !tipoMap[nome]) tipoMap[nome] = tipo;
        });
        setClienteTipoMap(tipoMap);

        const tiposCliente = [...new Set(vendas.map(v => (v.tipoCliente || '').trim()).filter(Boolean))].sort();

        setFilterOptions({
          cliente: extractUnique(base, 'nomeFantasia').sort(),
          categoria: extractUnique(base, 'categoria').sort(),
          regional: extractUnique(base, 'regional').sort(),
          estado: extractUnique(base, 'uf').sort(),
          cidade: extractUnique(base, 'cidade').sort(),
          vendedor: vendedoresOptions,
          tiposCliente,
        });

        // filtros iniciais (espelhar travas aplicadas)
        const initialFilters: ActiveRecenciaFilters = {};
        if (user && user.role === 'vendedor' && user.vendedor && un !== 'sara') {
          initialFilters.vendedor = [user.vendedor];
        }
        if ((user && user.role === 'gerente') || un === 'sara') {
          const allowed = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
            un === 'rodrigo' ? pickRegional('4') : (un === 'sandro' ? pickRegional('1') : pickRegional('3'))
          ];
          initialFilters.regional = allowed;
        }
        setActiveFilters(initialFilters);
        setFilteredRaw(applyFilters(base, initialFilters));
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' });
        setIsLoading(false);
      }
    };
    load();
  }, [user, toast]);

  const match = (vals?: string[], candidate?: string) => {
    if (!vals) return true;
    if (!candidate) return false;
    return vals.length === 0 ? true : vals.includes(candidate);
  };

  const applyFilters = (data: HistoryData[], filters: ActiveRecenciaFilters): HistoryData[] => {
    return data.filter(item => {
      // datas
      if (filters.dataInicio || filters.dataFim) {
        const [day, month, year] = (item.dataPedido || '').split('/');
        const itemDate = new Date(`${year}-${month}-${day}`);
        itemDate.setHours(0,0,0,0);
        if (filters.dataInicio && filters.dataInicio.length) {
          const start = new Date(filters.dataInicio[0]);
          start.setHours(0,0,0,0);
          if (itemDate < start) return false;
        }
        if (filters.dataFim && filters.dataFim.length) {
          const end = new Date(filters.dataFim[0]);
          end.setHours(0,0,0,0);
          if (itemDate > end) return false;
        }
      }
      if (!match(filters.cliente, item.nomeFantasia)) return false;
      if (!match(filters.categoria, item.categoria)) return false;
      if (!match(filters.regional, item.regional)) return false;
      if (!match(filters.estado, item.uf)) return false;
      if (!match(filters.cidade, item.cidade)) return false;
      if (!match(filters.vendedor, item.vendedor)) return false;
      // Tipo de Cliente com base no mapa de VENDAS
      const tipo = clienteTipoMap[(item.nomeFantasia || '').trim()];
      if (!match(filters.tipoCliente, tipo)) return false;
      return true;
    });
  };

  const resumo = useMemo<ClienteResumo[]>(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 365);
    const cutoff6m = new Date(now);
    cutoff6m.setMonth(cutoff6m.getMonth() - 6);
    const cutoff12to6 = new Date(now);
    cutoff12to6.setMonth(cutoff12to6.getMonth() - 12);

    const source = filteredRaw.length > 0 ? filteredRaw : raw;
    const map = new Map<string, HistoryData[]>();
    source.forEach(item => {
      const nome = item.nomeFantasia || '—';
      if (!map.has(nome)) map.set(nome, []);
      map.get(nome)!.push(item);
    });

    const res: ClienteResumo[] = [];
    for (const [nome, items] of map.entries()) {
      const withDates = items
        .map(i => ({ ...i, d: parseBRDate(i.dataPedido) }))
        .filter(i => i.d !== null) as (HistoryData & { d: Date })[];
      if (withDates.length === 0) {
        res.push({ nomeFantasia: nome, ultimaCompra: null, diasSemComprar: Infinity, pedidos12m: 0, faturamento12m: 0, mediaIntervaloDias: 0 });
        continue;
      }

      withDates.sort((a, b) => b.d.getTime() - a.d.getTime());
      const ultima = withDates[0].d;
      const diffMs = now.getTime() - ultima.getTime();
      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const lastYear = withDates.filter(i => i.d >= cutoff);
      // Contagem de pedidos: todas as linhas no mesmo dia contam como 1 pedido
      const pedidoSet = new Set<string>();
      let faturamento = 0;
      lastYear.forEach(i => {
        const dKey = i.d.toISOString().slice(0, 10); // YYYY-MM-DD
        pedidoSet.add(dKey);
        faturamento += i.valor || 0;
      });

      // Faturamento últimos 6 meses vs 6 anteriores
      const last6m = withDates.filter(i => i.d >= cutoff6m);
      const prev6m = withDates.filter(i => i.d < cutoff6m && i.d >= cutoff12to6);
      const faturamento6m = last6m.reduce((sum, i) => sum + (i.valor || 0), 0);
      const faturamento6mAnterior = prev6m.reduce((sum, i) => sum + (i.valor || 0), 0);
      let tendencia: '📈 CRESCENDO' | '📉 DECLINANDO' | '➡️ ESTÁVEL' = '➡️ ESTÁVEL';
      if (faturamento6m > faturamento6mAnterior) tendencia = '📈 CRESCENDO';
      else if (faturamento6m < faturamento6mAnterior) tendencia = '📉 DECLINANDO';

      // média de intervalo de dias entre compras (nos últimos 12m, se possível)
      let mediaIntervalo = 0;
      if (lastYear.length > 1) {
        let totalIntervalo = 0;
        for (let k = 1; k < lastYear.length; k++) {
          totalIntervalo += Math.abs(lastYear[k - 1].d.getTime() - lastYear[k].d.getTime());
        }
        const diasInt = totalIntervalo / (1000 * 60 * 60 * 24);
        mediaIntervalo = Math.round(diasInt / (lastYear.length - 1));
      }

      // RFV Scores
      const scoreRecencia =
        dias <= 30 ? 5 : dias <= 60 ? 4 : dias <= 90 ? 3 : dias <= 180 ? 2 : 1;
      const pedidos = pedidoSet.size;
      const scoreFrequencia =
        pedidos >= 15 ? 5 : pedidos >= 10 ? 4 : pedidos >= 6 ? 3 : pedidos >= 3 ? 2 : 1;
      const scoreValor =
        faturamento >= 400000 ? 5 : faturamento >= 200000 ? 4 : faturamento >= 100000 ? 3 : faturamento >= 50000 ? 2 : 1;
      const scoreRFV = `${scoreRecencia}${scoreFrequencia}${scoreValor}`;

      // Segmentação
      const inSet = (codes: string[]) => codes.includes(scoreRFV);
      let segmento = '📊 OUTROS';
      if (inSet(['555','554','544','545','454','455','445'])) segmento = '🏆 CAMPEÃO';
      else if (inSet(['543','444','435','355','354','345','344','335'])) segmento = '💎 LEAL';
      else if (inSet(['512','511','422','421','412','411','311'])) segmento = '🌟 NOVO';
      else if (inSet(['155','154','144','214','215','115','114','113'])) segmento = '⚠️ RISCO';
      else if (inSet(['255','151','141','131','121','111','152','142'])) segmento = '😴 HIBERNANDO';

      // Status visual
      const statusVisual: '🟢' | '🟡' | '🔴' = dias <= 30 ? '🟢' : dias <= 90 ? '🟡' : '🔴';

      // Ação recomendada e prioridade
      let acaoRecomendada = 'Análise Individual';
      let prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA' = 'BAIXA';
      if (segmento === '🏆 CAMPEÃO') { acaoRecomendada = 'Programa VIP + Produtos Premium'; prioridade = 'ALTA'; }
      else if (segmento === '💎 LEAL') { acaoRecomendada = 'Cross-sell + Fidelização'; prioridade = 'MÉDIA'; }
      else if (segmento === '🌟 NOVO') { acaoRecomendada = 'Onboarding + Acompanhamento'; prioridade = 'MÉDIA'; }
      else if (segmento === '⚠️ RISCO') { acaoRecomendada = 'URGENTE: Campanha Reativação'; prioridade = 'ALTA'; }
      else if (segmento === '😴 HIBERNANDO') { acaoRecomendada = 'Pesquisa + Oferta Especial'; prioridade = 'BAIXA'; }

      const ticketMedio = pedidos > 0 ? Math.round((faturamento / pedidos) * 100) / 100 : 0;

      res.push({
        nomeFantasia: nome,
        ultimaCompra: ultima,
        diasSemComprar: dias,
        pedidos12m: pedidos,
        faturamento12m: faturamento,
        mediaIntervaloDias: mediaIntervalo,
        scoreRecencia,
        scoreFrequencia,
        scoreValor,
        scoreRFV,
        segmento,
        ticketMedio,
        faturamento6m,
        faturamento6mAnterior,
        tendencia,
        statusVisual,
        acaoRecomendada,
        prioridade,
      });
    }

    let filteredBySearch = search
      ? res.filter(r => r.nomeFantasia.toLowerCase().includes(search.toLowerCase()))
      : res;

    // Filtros RFV
    if (filterSegmento.length > 0) {
      filteredBySearch = filteredBySearch.filter(r => filterSegmento.includes(r.segmento || ''));
    }
    if (filterPrioridade.length > 0) {
      filteredBySearch = filteredBySearch.filter(r => r.prioridade && filterPrioridade.includes(r.prioridade));
    }
    if (filterTendencia.length > 0) {
      filteredBySearch = filteredBySearch.filter(r => r.tendencia && filterTendencia.includes(r.tendencia));
    }
    const minScore = parseInt(scoreMin || '111', 10);
    const maxScore = parseInt(scoreMax || '555', 10);
    if (!Number.isNaN(minScore) || !Number.isNaN(maxScore)) {
      filteredBySearch = filteredBySearch.filter(r => {
        const s = parseInt(r.scoreRFV || '111', 10);
        return s >= minScore && s <= maxScore;
      });
    }

    const arr = [...filteredBySearch];
    arr.sort((a, b) => {
      if (sortKey === 'prioridade') {
        const rank = (p?: 'ALTA' | 'MÉDIA' | 'BAIXA') => (p === 'ALTA' ? 3 : p === 'MÉDIA' ? 2 : p === 'BAIXA' ? 1 : 0);
        const cmpPri = rank(b.prioridade) - rank(a.prioridade); // desc por padrão
        if (cmpPri !== 0) return sortOrder === 'asc' ? -cmpPri : cmpPri;
        const cmpFat = (b.faturamento12m || 0) - (a.faturamento12m || 0); // desc
        if (cmpFat !== 0) return cmpFat;
        const cmpDias = (a.diasSemComprar || 0) - (b.diasSemComprar || 0); // asc
        return cmpDias;
      }
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else {
        const sa = String(va || '').toLowerCase();
        const sb = String(vb || '').toLowerCase();
        cmp = sa.localeCompare(sb, 'pt-BR');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [raw, filteredRaw, search, sortKey, sortOrder]);

  const handleApplyFilters = () => {
    const recomputed = applyFilters(raw, activeFilters);
    setFilteredRaw(recomputed);
  };

  const handleClearFilters = () => {
    let cleared: ActiveRecenciaFilters = {};
    const un = (user?.username || '').toLowerCase();
    if (user && user.role === 'vendedor' && user.vendedor && un !== 'sara') {
      cleared.vendedor = [user.vendedor];
    }
    const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
    const regionais = [...new Set(raw.map(i => i.regional).filter(Boolean))] as string[];
    const pickRegional = (label: string) => (
      regionais.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
    );
    const wantsTwoThree = un === 'joao' || un === 'sara';
    if ((user && user.role === 'gerente') || un === 'sara') {
      cleared.regional = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
        un === 'rodrigo' ? pickRegional('4') : (un === 'sandro' ? pickRegional('1') : pickRegional('3'))
      ];
    }
    setActiveFilters(cleared);
    setFilteredRaw(applyFilters(raw, cleared));
    const msg = (user?.role === 'vendedor')
      ? 'Filtros limpos. Filtro de vendedor mantido.'
      : ((user?.role === 'gerente' || un === 'sara')
        ? (wantsTwoThree ? 'Filtros limpos. Regionais 2 e 3 mantidas.' : (un === 'rodrigo' ? 'Filtros limpos. Regional 4 mantida.' : (un === 'sandro' ? 'Filtros limpos. Regional 1 mantida.' : 'Filtros limpos. Regional 3 mantida.')))
        : 'Mostrando todos os dados disponíveis.');
    toast({ title: 'Filtros limpos', description: msg });
  };

  const formatDateBR = (d: Date | null) => d ? d.toLocaleDateString('pt-BR') : '—';
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSort = (key: keyof ClienteResumo) => {
    if (sortKey === key) setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortOrder('desc'); }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = resumo.length;
    const sum = (seg: string) => resumo.filter(r => r.segmento === seg).reduce((acc, r) => acc + (r.faturamento12m || 0), 0);
    const count = (seg: string) => resumo.filter(r => r.segmento === seg).length;
    const percent = (n: number) => total > 0 ? Math.round((n * 1000) / total) / 10 : 0; // 1 decimal
    const receitaTotal = resumo.reduce((acc, r) => acc + (r.faturamento12m || 0), 0);
    const crescendo = resumo.filter(r => r.tendencia === '📈 CRESCENDO').length;
    const declinando = resumo.filter(r => r.tendencia === '📉 DECLINANDO').length;
    const urgentes = count('⚠️ RISCO');
    const campeoes = count('🏆 CAMPEÃO');
    const leais = count('💎 LEAL');
    const oportunidade = sum('🌟 NOVO');
    return { total, receitaTotal, crescendo, declinando, urgentes, campeoes, leais, oportunidade, percent };
  }, [resumo]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/') } className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Recência e Recorrência de Compras</h1>
        </div>

        {/* Cards de KPI (minimalistas) */}
        {!isLoading && (
          <div
            className="grid gap-3 mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
          >
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#FFD700' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">🏆 CAMPEÕES</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.campeoes}</div>
                <div className="text-xs text-muted-foreground">{kpis.percent(kpis.campeoes)}% da base</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#3B82F6' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">💎 LEAIS</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.leais}</div>
                <div className="text-xs text-muted-foreground">{kpis.percent(kpis.leais)}% da base</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#F59E0B' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">⚠️ EM RISCO</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.urgentes}</div>
                <div className="text-xs text-muted-foreground">{kpis.percent(kpis.urgentes)}% da base</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#22C55E' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">💰 RECEITA TOTAL</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{formatCurrency(kpis.receitaTotal)}</div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Segunda fileira de KPIs (minimalistas) */}
        {!isLoading && (
          <div
            className="grid gap-3 mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
          >
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#22C55E' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">📈 CRESCENDO</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.crescendo}</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#EF4444' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">📉 DECLINANDO</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.declinando}</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#F59E0B' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">🎯 OPORTUNIDADE</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{formatCurrency(kpis.oportunidade)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-slate-200 shadow-none border-l-2" style={{ borderLeftColor: '#DC2626' }}>
              <CardHeader className="p-3">
                <CardTitle className="text-xs">⏰ AÇÃO URGENTE</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-lg font-semibold">{kpis.urgentes}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
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
              extraFilters={(
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Buscar por cliente */}
                  <div className="md:col-span-2 lg:col-span-4">
                    <Label className="text-sm font-medium">Buscar por cliente</Label>
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente" />
                  </div>
                  {/* Segmento RFV com multi e 'Todos' */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Segmento RFV</Label>
                    <Combobox
                      multiple
                      values={filterSegmento}
                      onChangeValues={(vals) => setFilterSegmento((vals || []).filter(v => v !== "__ALL__"))}
                      options={[
                        { value: "__ALL__", label: "Todos" },
                        { value: '🏆 CAMPEÃO', label: '🏆 CAMPEÃO' },
                        { value: '💎 LEAL', label: '💎 LEAL' },
                        { value: '🌟 NOVO', label: '🌟 NOVO' },
                        { value: '⚠️ RISCO', label: '⚠️ RISCO' },
                        { value: '😴 HIBERNANDO', label: '😴 HIBERNANDO' },
                        { value: '📊 OUTROS', label: '📊 OUTROS' },
                      ]}
                      placeholder="Selecione segmentos"
                      searchPlaceholder="Pesquisar..."
                    />
                  </div>
                  {/* Score RFV (min/max) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Score RFV (mín-máx)</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={111} max={555} value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
                      <Input type="number" min={111} max={555} value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
                    </div>
                  </div>
                  {/* Prioridade */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Prioridade</Label>
                    <Combobox
                      multiple
                      values={filterPrioridade}
                      onChangeValues={(vals) => setFilterPrioridade((vals || []).filter(v => v !== "__ALL__"))}
                      options={[
                        { value: "__ALL__", label: "Todos" },
                        { value: 'ALTA', label: 'ALTA' },
                        { value: 'MÉDIA', label: 'MÉDIA' },
                        { value: 'BAIXA', label: 'BAIXA' },
                      ]}
                      placeholder="Selecione prioridades"
                      searchPlaceholder="Pesquisar..."
                    />
                  </div>
                  {/* Tendência */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tendência</Label>
                    <Combobox
                      multiple
                      values={filterTendencia}
                      onChangeValues={(vals) => setFilterTendencia(((vals || []).filter(v => v !== "__ALL__")) as ('📈 CRESCENDO' | '📉 DECLINANDO' | '➡️ ESTÁVEL')[])}
                      options={[
                        { value: "__ALL__", label: "Todos" },
                        { value: '📈 CRESCENDO', label: '📈 CRESCENDO' },
                        { value: '📉 DECLINANDO', label: '📉 DECLINANDO' },
                        { value: '➡️ ESTÁVEL', label: '➡️ ESTÁVEL' },
                      ]}
                      placeholder="Selecione tendências"
                      searchPlaceholder="Pesquisar..."
                    />
                  </div>
                </div>
              )}
            />
          )}
        </div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Clientes: {resumo.length}</div>
              <div className="flex items-center gap-2">
                <Button
                  className="bg-gradient-primary text-white hover:opacity-90 px-3 py-2 rounded-lg"
                  onClick={() => { setIsClosingHelp(true); setShowHelpCard(true); }}
                  variant="default"
                >
                  💡 Como interpretar
                </Button>
                <ExportMenu
                  data={resumo}
                  fileBaseName="recencia-recorrencia"
                  columns={[
                    { label: 'Status', value: (i) => i.statusVisual || '' },
                    { label: 'Cliente', value: (i) => i.nomeFantasia },
                    { label: 'Segmento', value: (i) => i.segmento || '' },
                    { label: 'Score RFV', value: (i) => i.scoreRFV || '' },
                    { label: 'Última compra', value: (i) => i.ultimaCompra ? i.ultimaCompra.toLocaleDateString('pt-BR') : '—' },
                    { label: 'Dias sem comprar', value: (i) => Number.isFinite(i.diasSemComprar) ? i.diasSemComprar : '' },
                    { label: 'Pedidos 12m', value: (i) => i.pedidos12m },
                    { label: 'Faturamento 12m', value: (i) => i.faturamento12m.toFixed(2).replace('.', ',') },
                    { label: 'Ticket médio', value: (i) => (i.ticketMedio || 0).toFixed(2).replace('.', ',') },
                    { label: 'Tendência', value: (i) => i.tendencia || '' },
                    { label: 'Prioridade', value: (i) => i.prioridade || '' },
                  ] as ExportColumn<ClienteResumo>[]}
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap min-w-[72px]">Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomeFantasia')}>
                    <div className="flex items-center gap-1">
                      <span>Cliente</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none whitespace-nowrap min-w-[120px]" onClick={() => handleSort('segmento')}>
                    <div className="flex items-center gap-1">
                      <span>Segmento</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none whitespace-nowrap min-w-[100px]" onClick={() => handleSort('scoreRFV')}>
                    <div className="flex items-center gap-1">
                      <span>Score RFV</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none whitespace-nowrap min-w-[120px]" onClick={() => handleSort('ultimaCompra')}>
                    <div className="flex items-center gap-1">
                      <span>Última compra</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none whitespace-nowrap min-w-[130px]" onClick={() => handleSort('diasSemComprar')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Dias sem comprar</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none whitespace-nowrap min-w-[120px]" onClick={() => handleSort('pedidos12m')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Pedidos 12m</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none whitespace-nowrap min-w-[150px]" onClick={() => handleSort('faturamento12m')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Faturamento 12m</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none whitespace-nowrap min-w-[130px]" onClick={() => handleSort('ticketMedio')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Ticket médio</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none whitespace-nowrap min-w-[120px]" onClick={() => handleSort('tendencia')}>
                    <div className="flex items-center gap-1">
                      <span>Tendência</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('prioridade')}>
                    <div className="flex items-center gap-1">
                      <span>Prioridade</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.map((r, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/history', { state: { prefilledClient: r.nomeFantasia } })}>
                    <TableCell className="whitespace-nowrap">{r.statusVisual}</TableCell>
                    <TableCell className="font-medium break-words">{r.nomeFantasia}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.segmento}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.scoreRFV}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(r.ultimaCompra)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{Number.isFinite(r.diasSemComprar) ? r.diasSemComprar : '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{r.pedidos12m}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatCurrency(r.faturamento12m)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{(r.ticketMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.tendencia}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.prioridade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
      {showHelpCard && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${isClosingHelp ? 'bg-black/0' : 'bg-black/50'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeHelpWithAnimation(); }}
        >
          <div ref={helpContainerRef} className={`bg-white rounded-xl p-6 max-w-2xl w-[90%] max-h-[80vh] overflow-y-auto shadow-xl transition-all duration-200 ${isClosingHelp ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">🎯 Guia Rápido: Análise RFV (Recência, Frequência, Valor)</h3>
              <Button variant="ghost" onClick={closeHelpWithAnimation}>X</Button>
            </div>

            {/* Navegação removida por solicitação: os botões não eram úteis */}

            <div className="space-y-4 text-sm">
              <div ref={rfvRef}>
                <h4 className="font-medium mb-1">📊 RFV em 30 segundos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>R = Há quanto tempo comprou (Recência)</li>
                  <li>F = Quantas vezes comprou (Frequência)</li>
                  <li>V = Quanto gastou (Valor)</li>
                  <li>Score = Combinação dos 3 (ex: 555 = melhor cliente)</li>
                </ul>
              </div>

              <div ref={segmentosRef}>
                <h4 className="font-medium mb-1">🏷️ Segmentos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🏆 CAMPEÃO (555-544) — Compram recente, frequente e muito. Ação: Programa VIP, produtos premium</li>
                  <li>💎 LEAL (444-435) — Base fiel do negócio. Ação: Ofertas especiais, cross-sell</li>
                  <li>🌟 NOVO (522-311) — Potencial de crescimento. Ação: Nutrição, onboarding</li>
                  <li>📊 OUTROS (525-321) — Diversos. Ação: Segmentação específica</li>
                  <li>😴 HIBERNANDO (111) — Parados há muito tempo. Ação: Reativação urgente</li>
                </ul>
              </div>

              <div ref={coresRef}>
                <h4 className="font-medium mb-1">🎨 Cores e Símbolos</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🚦 Recência: 🟢 &le; 30 dias, 🟡 31–90 dias, 🔴 &gt; 90 dias</li>
                  <li>Tendências: 📈 CRESCENDO, 📉 DECLINANDO, ➡️ ESTÁVEL</li>
                </ul>
              </div>

              <div ref={filtrosRef}>
                <h4 className="font-medium mb-1">🎛️ Como usar os filtros</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Segmento RFV: selecione tipos de cliente</li>
                  <li>Score RFV: ajuste o range 111–555</li>
                  <li>Tendência: destaque quem cresce ou cai</li>
                  <li>Prioridade: foque no urgente</li>
                </ul>
              </div>

              <div ref={acoesRef}>
                <h4 className="font-medium mb-1">🎯 Ações práticas</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>🏆 Mantenha os CAMPEÕES felizes</li>
                  <li>🌟 Desenvolva os NOVOS</li>
                  <li>😴 Reative os HIBERNANDO</li>
                  <li>📉 Monitore DECLINANDO para evitar churn</li>
                </ul>
                <p className="mt-2 text-muted-foreground">Dica: use os filtros para criar listas e exportar ações direcionadas.</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={closeHelpWithAnimation} className="min-w-[120px]">Fechar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecenciaRecorrencia;
