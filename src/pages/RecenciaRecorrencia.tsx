import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
}

const RecenciaRecorrencia: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [raw, setRaw] = useState<HistoryData[]>([]);
  const [filteredRaw, setFilteredRaw] = useState<HistoryData[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof ClienteResumo>('diasSemComprar');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ cliente: [], categoria: [], regional: [], estado: [], cidade: [], vendedor: [] });
  type ActiveRecenciaFilters = BaseActiveFilters;
  const [activeFilters, setActiveFilters] = useState<ActiveRecenciaFilters>({});
  const [clienteTipoMap, setClienteTipoMap] = useState<Record<string, string>>({});

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
      const pedidoSet = new Set<string>();
      let faturamento = 0;
      lastYear.forEach(i => {
        const nf = (i.nf || '').trim();
        if (nf) pedidoSet.add(nf);
        faturamento += i.valor || 0;
      });

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

      res.push({
        nomeFantasia: nome,
        ultimaCompra: ultima,
        diasSemComprar: dias,
        pedidos12m: pedidoSet.size,
        faturamento12m: faturamento,
        mediaIntervaloDias: mediaIntervalo,
      });
    }

    const filteredBySearch = search
      ? res.filter(r => r.nomeFantasia.toLowerCase().includes(search.toLowerCase()))
      : res;

    const arr = [...filteredBySearch];
    arr.sort((a, b) => {
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
            />
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente" />
          </div>
        </div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Clientes: {resumo.length}</div>
              <ExportMenu
                data={resumo}
                fileBaseName="recencia-recorrencia"
                columns={[
                  { label: 'Cliente', value: (i) => i.nomeFantasia },
                  { label: 'Última compra', value: (i) => i.ultimaCompra ? i.ultimaCompra.toLocaleDateString('pt-BR') : '—' },
                  { label: 'Dias sem comprar', value: (i) => Number.isFinite(i.diasSemComprar) ? i.diasSemComprar : '' },
                  { label: 'Pedidos 12m', value: (i) => i.pedidos12m },
                  { label: 'Faturamento 12m', value: (i) => i.faturamento12m.toFixed(2).replace('.', ',') },
                  { label: 'Média intervalo (dias)', value: (i) => i.mediaIntervaloDias },
                ] as ExportColumn<ClienteResumo>[]}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomeFantasia')}>
                    <div className="flex items-center gap-1">
                      <span>Cliente</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('ultimaCompra')}>
                    <div className="flex items-center gap-1">
                      <span>Última compra</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('diasSemComprar')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Dias sem comprar</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('pedidos12m')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Pedidos 12m</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('faturamento12m')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Faturamento 12m</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('mediaIntervaloDias')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Média intervalo (dias)</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.map((r, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/history', { state: { prefilledClient: r.nomeFantasia } })}>
                    <TableCell className="font-medium">{r.nomeFantasia}</TableCell>
                    <TableCell>{formatDateBR(r.ultimaCompra)}</TableCell>
                    <TableCell className="text-right">{Number.isFinite(r.diasSemComprar) ? r.diasSemComprar : '—'}</TableCell>
                    <TableCell className="text-right">{r.pedidos12m}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.faturamento12m)}</TableCell>
                    <TableCell className="text-right">{r.mediaIntervaloDias || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
};

export default RecenciaRecorrencia;
