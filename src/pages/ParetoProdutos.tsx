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
      const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor 
        ? [user.vendedor]
        : allVendedores;

      setFilterOptions({
        clientes: [], // ocultaremos o campo cliente nesta página
        cidades: GoogleSheetsService.extractUniqueValues(data, 'cidade'),
        estados: GoogleSheetsService.extractUniqueValues(data, 'uf'),
        categorias: GoogleSheetsService.extractUniqueValues(data, 'categoria'),
        vendedores: vendedoresOptions,
        regionais: GoogleSheetsService.extractUniqueValues(data, 'regional'),
        tiposCliente: GoogleSheetsService.extractUniqueValues(data, 'tipoCliente')
      });

      let filteredData = data;
      let filtersToApply: ActiveFilters = {};

      if (user && user.role === 'vendedor' && user.vendedor) {
        filtersToApply = { vendedor: user.vendedor };
        filteredData = GoogleSheetsService.filterData(data, filtersToApply);
        setActiveFilters(filtersToApply);
      }

      // Trava de regional para gerente (Rodrigo: Regional 4; Sandro: Regional 1; outros: Regional 3)
      if (user && user.role === 'gerente') {
        const regionaisOpts = GoogleSheetsService.extractUniqueValues(data, 'regional');
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
        const un = user.username.toLowerCase();
        const isRodrigo = un === 'rodrigo';
        const isSandro = un === 'sandro';
        const regionalAlvo = isRodrigo
          ? (regionaisOpts.find(r => normalize(r) === 'regional4' || normalize(r) === 'regiao4' || r === '4') || 'Regional 4')
          : isSandro
            ? (regionaisOpts.find(r => normalize(r) === 'regional1' || normalize(r) === 'regiao1' || r === '1') || 'Regional 1')
            : regionaisOpts.find(r => normalize(r) === 'regional3' || normalize(r) === 'regiao3' || r === '3');
        if (regionalAlvo) {
          filtersToApply = { ...filtersToApply, regional: regionalAlvo };
          filteredData = GoogleSheetsService.filterData(data, filtersToApply);
          setActiveFilters(filtersToApply);
        }
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
    if (user && user.role === 'vendedor' && user.vendedor) {
      clearedFilters = { vendedor: user.vendedor };
    }

    // Se o usuário for gerente, manter regional travada (Rodrigo: Regional 4; Sandro: Regional 1; outros: Regional 3)
    if (user && user.role === 'gerente') {
      const regionaisOpts = GoogleSheetsService.extractUniqueValues(rawData, 'regional');
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const un = user.username.toLowerCase();
      const isRodrigo = un === 'rodrigo';
      const isSandro = un === 'sandro';
      const regionalAlvo = isRodrigo
        ? (regionaisOpts.find(r => normalize(r) === 'regional4' || normalize(r) === 'regiao4' || r === '4') || 'Regional 4')
        : isSandro
          ? (regionaisOpts.find(r => normalize(r) === 'regional1' || normalize(r) === 'regiao1' || r === '1') || 'Regional 1')
          : regionaisOpts.find(r => normalize(r) === 'regional3' || normalize(r) === 'regiao3' || r === '3');
      if (regionalAlvo) {
        clearedFilters = { ...clearedFilters, regional: regionalAlvo };
      }
    }

    setActiveFilters(clearedFilters);

    let dataToAnalyze = rawData;
    if (Object.keys(clearedFilters).length > 0) {
      dataToAnalyze = GoogleSheetsService.filterData(rawData, clearedFilters);
    }

    setFilteredData(dataToAnalyze);
    performAnalysis(dataToAnalyze);

    const isRodrigo = user?.username?.toLowerCase() === 'rodrigo';
    const isSandro = user?.username?.toLowerCase() === 'sandro';
    toast({
      title: 'Filtros limpos',
      description: user?.role === 'vendedor' 
        ? 'Filtros limpos. Filtro de vendedor mantido.'
        : user?.role === 'gerente'
          ? (isRodrigo ? 'Filtros limpos. Regional 4 mantida.' : (isSandro ? 'Filtros limpos. Regional 1 mantida.' : 'Filtros limpos. Regional 3 mantida.'))
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
    if (user && user.role === 'vendedor' && user.vendedor && rawData.length > 0) {
      const newFilters = { ...activeFilters, vendedor: user.vendedor };
      setActiveFilters(newFilters);
      const filtered = GoogleSheetsService.filterData(rawData, newFilters);
      setFilteredData(filtered);
      performAnalysis(filtered);
    } else if (user && user.role === 'gerente' && rawData.length > 0) {
      const regionaisOpts = GoogleSheetsService.extractUniqueValues(rawData, 'regional');
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      const un = user.username.toLowerCase();
      const isRodrigo = un === 'rodrigo';
      const isSandro = un === 'sandro';
      const regionalAlvo = isRodrigo
        ? (regionaisOpts.find(r => normalize(r) === 'regional4' || normalize(r) === 'regiao4' || r === '4') || 'Regional 4')
        : isSandro
          ? (regionaisOpts.find(r => normalize(r) === 'regional1' || normalize(r) === 'regiao1' || r === '1') || 'Regional 1')
          : regionaisOpts.find(r => normalize(r) === 'regional3' || normalize(r) === 'regiao3' || r === '3');
      const newFilters: ActiveFilters = regionalAlvo ? { ...activeFilters, regional: regionalAlvo } : { ...activeFilters };
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
                  hideCliente={true}
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