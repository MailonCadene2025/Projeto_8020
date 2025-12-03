import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { ParetoFilters, type FilterOptions as ParetoFilterOptions, type ActiveFilters } from '@/components/ParetoFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { GoogleSheetsService, type HistoryData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

type ChartPoint = {
  name: string; // Mês/ano
  [year: string]: number | string; // e.g., '2024': valor do mês
};

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const colorsByYear: Record<string, string> = {
  '2023': '#3b82f6',
  '2024': '#f97316',
  '2025': '#22c55e',
  '2026': '#8b5cf6',
};

// Converte uma data para o período de comissão (encerramento no mês seguinte para dias >= 23)
const toCommissionPeriod = (d: Date) => {
  const day = d.getDate();
  let monthEnd = d.getMonth(); // 0..11
  let yearEnd = d.getFullYear();
  if (day >= 23) {
    monthEnd += 1;
    if (monthEnd > 11) {
      monthEnd = 0;
      yearEnd += 1;
    }
  }
  const key = `${yearEnd}-${String(monthEnd + 1).padStart(2, '0')}`;
  const label = `${monthNames[monthEnd]}/${yearEnd}`;
  return { yearEnd, monthEnd, key, label };
};

// Avança um período de comissão (mesma lógica de mês)
const nextCommissionPeriod = (year: number, month: number) => {
  let m = month + 1;
  let y = year;
  if (m > 11) {
    m = 0;
    y += 1;
  }
  return { yearEnd: y, monthEnd: m };
};

// Compara períodos (ano/mes) para iteração
const periodLTE = (aY: number, aM: number, bY: number, bM: number) => {
  return aY < bY || (aY === bY && aM <= bM);
};

// Formata valor arredondado para rótulos curtos visíveis sem hover
const formatShortCurrency = (val: number) => {
  if (!isFinite(val)) return '';
  if (Math.abs(val) >= 1000) {
    return `R$ ${Math.round(val / 1000)}k`;
  }
  return `R$ ${Math.round(val)}`;
};

const renderValueLabel = (props: any) => {
  const { x, y, value } = props;
  if (value == null || x == null || y == null) return null;
  return (
    <text x={x} y={y - 8} fill="#334155" fontSize={11} textAnchor="middle">
      {formatShortCurrency(Number(value))}
    </text>
  );
};

const CurvaCrescimento: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rawData, setRawData] = useState<HistoryData[]>([]);
  const [filteredData, setFilteredData] = useState<HistoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const [filterOptions, setFilterOptions] = useState<ParetoFilterOptions>({
    clientes: [],
    cidades: [],
    estados: [],
    categorias: [],
    vendedores: [],
    regionais: [],
    tiposCliente: [],
  });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  // Carregar dados de histórico
  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const historyData = await service.fetchHistoryData();
        setRawData(historyData);

        // Construir opções de filtro
        const extractUnique = (data: HistoryData[], key: keyof HistoryData) =>
          [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        const allVendedores = extractUnique(historyData, 'vendedor').sort();
        const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara')
          ? [user.vendedor]
          : allVendedores;

        setFilterOptions({
          clientes: extractUnique(historyData, 'nomeFantasia').sort(),
          cidades: extractUnique(historyData, 'cidade').sort(),
          estados: extractUnique(historyData, 'uf').sort(),
          categorias: extractUnique(historyData, 'categoria').sort(),
          vendedores: vendedoresOptions,
          regionais: extractUnique(historyData, 'regional').sort(),
          tiposCliente: [],
        });

        // Aplicar filtros iniciais por papel
        let initialFilters: ActiveFilters = {};
        let baseData: HistoryData[] = historyData;

        const regionaisOpts = extractUnique(historyData, 'regional');
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
        const pickRegional = (label: string) => (
          regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
        );
        const un = (user?.username || '').toLowerCase();
        const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (user && user.role === 'vendedor' && user.vendedor && unNorm !== 'sara') {
          initialFilters.vendedor = [user.vendedor];
        }
        if ((user && user.role === 'gerente') || unNorm === 'sara') {
          const locked = (unNorm === 'joao' || unNorm === 'sara') ? [pickRegional('2'), pickRegional('3')] : [
            unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
          ];
          initialFilters.regional = locked;
        }

        setActiveFilters(initialFilters);
        baseData = GoogleSheetsService.filterData(historyData as any, initialFilters as any) as any;
        setFilteredData(baseData);

        toast({
          title: 'Dados carregados',
          description: `${baseData.length} registros disponíveis para análise.`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro ao carregar dados';
        toast({ title: 'Erro', description: msg, variant: 'destructive' });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const match = (vals?: string[], candidate?: string) => {
    if (!vals) return true;
    if (!candidate) return false;
    return vals.length === 0 ? true : vals.includes(candidate);
  };

  const applyFilters = () => {
    setIsLoading(true);
    try {
      // Filtragem manual incluindo período
      const filtered = rawData.filter(item => {
        if (!item.dataPedido) return false;
        const [day, month, yearStr] = item.dataPedido.split('/');
        const itemDate = new Date(`${yearStr}-${month}-${day}`);
        itemDate.setHours(0, 0, 0, 0);

        if (activeFilters.dataInicio && activeFilters.dataInicio[0]) {
          const start = new Date(activeFilters.dataInicio[0]);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (activeFilters.dataFim && activeFilters.dataFim[0]) {
          const end = new Date(activeFilters.dataFim[0]);
          end.setHours(0, 0, 0, 0);
          if (itemDate > end) return false;
        }

        if (!match(activeFilters.cliente, item.nomeFantasia)) return false;
        if (!match(activeFilters.categoria, item.categoria)) return false;
        // Exceção: gerente João vê vendas de João independentemente da regional
        const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
        const vendorsSelected = activeFilters.vendedor || undefined;
        const passRegional = match(activeFilters.regional, item.regional) || (
          isJoaoGerente && norm(item.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(item.vendedor))
        );
        if (!passRegional) return false;
        if (!match(activeFilters.estado, item.uf)) return false;
        if (!match(activeFilters.cidade, item.cidade)) return false;
        if (!match(activeFilters.vendedor, item.vendedor)) return false;
        return true;
      });
      setFilteredData(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    let cleared: ActiveFilters = {};
    if (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara') {
      cleared.vendedor = [user.vendedor];
    }
    {
      const regionaisOpts = Array.from(new Set(rawData.map(i => i.regional).filter(Boolean)));
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const pickRegional = (label: string) => (
        regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        cleared.regional = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ];
      }
    }
    setActiveFilters(cleared);
    const filtered = GoogleSheetsService.filterData(rawData as any, cleared as any) as any;
    // Exceção João gerente ao limpar filtros
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
    const vendorsSelected = cleared.vendedor || undefined;
    const extraJoao = isJoaoGerente
      ? rawData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
      : [];
    const combined = Array.from(new Set([...(filtered as HistoryData[]), ...extraJoao]));
    setFilteredData(combined);
  };

  // Construir dados para gráfico: pontos mensais e linhas por ano
  const chartData: ChartPoint[] = useMemo(() => {
    if (filteredData.length === 0) return [];

    // Determinar intervalo de período de comissão selecionado ou usar o intervalo dos dados
    let startPeriod: { yearEnd: number; monthEnd: number } | null = null;
    let endPeriod: { yearEnd: number; monthEnd: number } | null = null;
    if (activeFilters.dataInicio && activeFilters.dataInicio[0]) {
      const d = new Date(activeFilters.dataInicio[0]);
      const sp = toCommissionPeriod(d);
      startPeriod = { yearEnd: sp.yearEnd, monthEnd: sp.monthEnd };
    }
    if (activeFilters.dataFim && activeFilters.dataFim[0]) {
      const d = new Date(activeFilters.dataFim[0]);
      const ep = toCommissionPeriod(d);
      endPeriod = { yearEnd: ep.yearEnd, monthEnd: ep.monthEnd };
    }

    // Se não definido, usar min/max dos dados convertidos para período de comissão
    const periods = filteredData
      .map(i => {
        const [day, month, yearStr] = i.dataPedido.split('/');
        const dt = new Date(`${yearStr}-${month}-${day}`);
        dt.setHours(0, 0, 0, 0);
        return toCommissionPeriod(dt);
      })
      .filter(Boolean);
    periods.sort((a, b) => (a.yearEnd - b.yearEnd) || (a.monthEnd - b.monthEnd));
    if (!startPeriod && periods.length > 0) {
      startPeriod = { yearEnd: periods[0].yearEnd, monthEnd: periods[0].monthEnd };
    }
    if (!endPeriod && periods.length > 0) {
      const last = periods[periods.length - 1];
      endPeriod = { yearEnd: last.yearEnd, monthEnd: last.monthEnd };
    }
    if (!startPeriod || !endPeriod) return [];

    // Agregar valores por período de comissão (mês/ano de encerramento)
    const monthly: Record<string, { label: string; byYear: Record<string, number> }> = {};
    filteredData.forEach(item => {
      const [day, month, yearStr] = item.dataPedido.split('/');
      const dt = new Date(`${yearStr}-${month}-${day}`);
      dt.setHours(0, 0, 0, 0);
      const cp = toCommissionPeriod(dt);
      const key = cp.key;
      const yearStrEnd = String(cp.yearEnd);
      if (!monthly[key]) {
        monthly[key] = { label: cp.label, byYear: {} };
      }
      monthly[key].byYear[yearStrEnd] = (monthly[key].byYear[yearStrEnd] || 0) + (item.valor || 0);
    });

    // Construir série para cada mês no intervalo
    const points: ChartPoint[] = [];
    const yearsSet = new Set<string>();
    let curY = startPeriod.yearEnd;
    let curM = startPeriod.monthEnd;
    while (periodLTE(curY, curM, endPeriod.yearEnd, endPeriod.monthEnd)) {
      const key = `${curY}-${String(curM + 1).padStart(2, '0')}`;
      const label = `${monthNames[curM]}/${curY}`;
      const base: ChartPoint = { name: label };

      const bucket = monthly[key];
      const byYear = bucket ? bucket.byYear : {};
      Object.keys(byYear).forEach(yr => yearsSet.add(yr));
      for (const yr of Array.from(yearsSet)) {
        base[yr] = byYear[yr] || 0;
      }
      points.push(base);
      const next = nextCommissionPeriod(curY, curM);
      curY = next.yearEnd;
      curM = next.monthEnd;
    }
    return points;
  }, [filteredData, activeFilters.dataInicio, activeFilters.dataFim]);

  const yearsInData = useMemo(() => {
    const set = new Set<string>();
    chartData.forEach(p => {
      Object.keys(p).forEach(k => {
        if (k !== 'name') {
          set.add(k);
        }
      });
    });
    return Array.from(set).sort();
  }, [chartData]);

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <Button variant="ghost" size="sm" onClick={() => setFiltersCollapsed(c => !c)}>
              {filtersCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
              {filtersCollapsed ? 'Expandir' : 'Colapsar'}
            </Button>
          </div>
          {!filtersCollapsed && (
            <ParetoFilters
              filterOptions={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
              isLoading={isLoading}
              hideCliente={false}
            />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Curva de Crescimento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} />
                <YAxis tickFormatter={(value) => `R$ ${Number(value) >= 1000 ? (value as number / 1000).toFixed(0) + 'k' : value}`} />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
                <Legend verticalAlign="top" height={36} iconType="line" />
                {yearsInData.map((yr) => (
                  <Line
                    key={yr}
                    type="monotone"
                    dataKey={yr}
                    stroke={colorsByYear[yr] || '#0ea5e9'}
                    strokeWidth={3}
                    name={yr}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  >
                    <LabelList dataKey={yr} content={renderValueLabel} />
                  </Line>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CurvaCrescimento;
