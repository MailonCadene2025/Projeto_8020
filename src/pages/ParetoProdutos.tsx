import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig } from '@/components/GoogleSheetsConfig';
import { ParetoFilters, FilterOptions, ActiveFilters } from '@/components/ParetoFilters';
import { ParetoProductsMetrics } from '@/components/ParetoProductsMetrics';
import { ParetoProductsTable, ParetoProduct } from '@/components/ParetoProductsTable';
import { ParetoProductsChart } from '@/components/ParetoProductsChart';
import { GoogleSheetsService, SalesData } from '@/services/googleSheetsService';
import { ParetoProductsAnalysisService } from '@/services/paretoProductsAnalysisService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

const ParetoProdutos = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [googleSheetsService, setGoogleSheetsService] = useState<GoogleSheetsService>();

  const [rawData, setRawData] = useState<SalesData[]>([]);
  const [filteredData, setFilteredData] = useState<SalesData[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    clientes: [],
    cidades: [],
    estados: [],
    categorias: [],
    vendedores: [],
    regionais: [],
    tiposCliente: []
  });

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [paretoProducts, setParetoProducts] = useState<ParetoProduct[]>([]);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    topCategoriesCount: 0,
    topCategoriesPercentage: 0,
    totalCategories: 0,
    totalProducts: 0
  });
  const [chartData, setChartData] = useState<Array<{
    categoria: string;
    vendas: number;
    percentualAcumulado: number;
    percentualIndividual: number;
  }>>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const { toast } = useToast();

  const handleConnect = async (apiKey: string, sheetId: string) => {
    setIsConnecting(true);
    setConnectionError(undefined);

    try {
      const service = new GoogleSheetsService(apiKey, sheetId);
      const data = await service.fetchData();
      if (data.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      setGoogleSheetsService(service);
      setRawData(data);

      const allVendedores = GoogleSheetsService.extractUniqueValues(data, 'vendedor');
      const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && user.username.toLowerCase() !== 'sara')
        ? [user.vendedor]
        : allVendedores;

      setFilterOptions({
        clientes: GoogleSheetsService.extractUniqueValues(data, 'nomeFantasia'),
        cidades: GoogleSheetsService.extractUniqueValues(data, 'cidade'),
        estados: GoogleSheetsService.extractUniqueValues(data, 'uf'),
        categorias: GoogleSheetsService.extractUniqueValues(data, 'categoria'),
        vendedores: vendedoresOptions,
        regionais: GoogleSheetsService.extractUniqueValues(data, 'regional'),
        tiposCliente: GoogleSheetsService.extractUniqueValues(data, 'tipoCliente')
      });

      let filteredData = data;
      let filtersToApply: ActiveFilters = {};

      const regionaisOpts = GoogleSheetsService.extractUniqueValues(data, 'regional');
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const pickRegional = (label: string) => (
        regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (user && user.role === 'vendedor' && user.vendedor && unNorm !== 'sara') {
        filtersToApply = { vendedor: [user.vendedor] };
      }

      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        const locked = (unNorm === 'joao' || unNorm === 'sara') ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ];
        filtersToApply = { ...filtersToApply, regional: locked };
      }

      if (Object.keys(filtersToApply).length > 0) {
        filteredData = GoogleSheetsService.filterData(data, filtersToApply);
        setActiveFilters(filtersToApply);
      }

      setFilteredData(filteredData);
      setIsConnected(true);

      performAnalysis(filteredData);

      toast({
        title: 'Conexão estabelecida!',
        description: `${filteredData.length} registros carregados com sucesso.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setConnectionError(errorMessage);
      toast({
        title: 'Erro de conexão',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApplyFilters = () => {
    if (!googleSheetsService) return;
    setIsAnalyzing(true);
    try {
      const filtered = GoogleSheetsService.filterData(rawData, activeFilters);
      setFilteredData(filtered);
      performAnalysis(filtered);
      toast({
        title: 'Filtros aplicados',
        description: `Analisando ${filtered.length} registros filtrados.`,
      });
    } catch (error) {
      toast({
        title: 'Erro na análise',
        description: 'Erro ao aplicar filtros e analisar dados.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearFilters = () => {
    let clearedFilters: ActiveFilters = {};
    if (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara') {
      clearedFilters = { vendedor: [user.vendedor] };
    }

    {
      const regionaisOpts = GoogleSheetsService.extractUniqueValues(rawData, 'regional');
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const pickRegional = (label: string) => (
        regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const wantsTwoThree = unNorm === 'joao' || unNorm === 'sara';
      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        clearedFilters = { ...clearedFilters, regional: wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ] };
      }
    }

    setActiveFilters(clearedFilters);

    let dataToAnalyze = rawData;
    if (Object.keys(clearedFilters).length > 0) {
      dataToAnalyze = GoogleSheetsService.filterData(rawData, clearedFilters);
    }

    setFilteredData(dataToAnalyze);
    performAnalysis(dataToAnalyze);

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

  const performAnalysis = (data: SalesData[]) => {
    const analysis = ParetoProductsAnalysisService.performAnalysis(data);
    setParetoProducts(analysis.products);
    setMetrics(analysis.metrics);
    setChartData(analysis.chartData);
  };

  const handleExport = () => {
    ParetoProductsAnalysisService.downloadCSV(paretoProducts, 'analise-pareto-produtos.csv');
    toast({
      title: 'Dados exportados',
      description: 'Arquivo CSV baixado com sucesso.',
    });
  };

  useEffect(() => {
    if (rawData.length > 0) {
      const regionaisOpts = GoogleSheetsService.extractUniqueValues(rawData, 'regional');
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const pickRegional = (label: string) => (
        regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label) || `Regional ${label}`
      );
      const un = (user?.username || '').toLowerCase();
      const unNorm = un.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let newFilters = { ...activeFilters } as ActiveFilters;

      if (user && user.role === 'vendedor' && user.vendedor && unNorm !== 'sara') {
        newFilters = { ...newFilters, vendedor: [user.vendedor] };
      }

      if ((user && user.role === 'gerente') || unNorm === 'sara') {
        const locked = (unNorm === 'joao' || unNorm === 'sara') ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ];
        newFilters = { ...newFilters, regional: locked };
      }

      setActiveFilters(newFilters);
      const filtered = GoogleSheetsService.filterData(rawData, newFilters);
      setFilteredData(filtered);
      performAnalysis(filtered);
    } else if (user && user.role === 'admin') {
      setActiveFilters({});
      if (rawData.length > 0) {
        setFilteredData(rawData);
        performAnalysis(rawData);
      }
    }
  }, [user, rawData]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6 space-y-6">
        <GoogleSheetsConfig 
          onConnect={handleConnect}
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={connectionError}
        />

        {isConnected && (
          <>
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
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  isLoading={isAnalyzing}
                  hideCliente={false}
                />
              )}
            </div>

            {/* Métricas */}
            <ParetoProductsMetrics {...metrics} />

            {/* Gráfico */}
            <ParetoProductsChart data={chartData} />

            {/* Tabela */}
            <ParetoProductsTable data={paretoProducts} />

            {/* Exportação */}
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
                onClick={handleExport}
              >
                Exportar CSV
              </button>
            </div>
          </>
        )}

        {isAnalyzing && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analisando dados...
          </div>
        )}
      </main>
    </div>
  );
};

export default ParetoProdutos;
