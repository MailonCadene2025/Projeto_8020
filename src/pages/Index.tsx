import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig } from '@/components/GoogleSheetsConfig';
import { ParetoFilters, FilterOptions, ActiveFilters } from '@/components/ParetoFilters';
import { ParetoMetrics } from '@/components/ParetoMetrics';
import { ParetoTable, ParetoClient } from '@/components/ParetoTable';
import { ParetoChart } from '@/components/ParetoChart';
import { GoogleSheetsService, SalesData } from '@/services/googleSheetsService';
import { ParetoAnalysisService } from '@/services/paretoAnalysisService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3, Wifi, WifiOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user } = useAuth();
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [googleSheetsService, setGoogleSheetsService] = useState<GoogleSheetsService>();
  
  // Data states
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
  
  // Analysis states
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [paretoClients, setParetoClients] = useState<ParetoClient[]>([]);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    topClientsCount: 0,
    topClientsPercentage: 0,
    totalClients: 0,
    totalProducts: 0
  });
  const [chartData, setChartData] = useState<Array<{
    cliente: string;
    vendas: number;
    percentualAcumulado: number;
    percentualIndividual: number;
  }>>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const { toast } = useToast();

  // Connect to Google Sheets
  const handleConnect = async (apiKey: string, sheetId: string) => {
    setIsConnecting(true);
    setConnectionError(undefined);
    
    try {
      const service = new GoogleSheetsService(apiKey, sheetId);
      
      // Test connection and fetch data
      const data = await service.fetchData();
      
      if (data.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha');
      }
      
      setGoogleSheetsService(service);
      setRawData(data);
      
      // Build filter options
      const allVendedores = GoogleSheetsService.extractUniqueValues(data, 'vendedor');
      const vendedoresOptions = (user && user.role === 'vendedor' && user.vendedor && user.username.toLowerCase() !== 'sara')
        ? [user.vendedor] // Vendedor comum vê apenas seu próprio nome
        : allVendedores;   // Admin, gerente e Sara veem todos
      
      setFilterOptions({
        clientes: GoogleSheetsService.extractUniqueValues(data, 'nomeFantasia'),
        cidades: GoogleSheetsService.extractUniqueValues(data, 'cidade'),
        estados: GoogleSheetsService.extractUniqueValues(data, 'uf'),
        categorias: GoogleSheetsService.extractUniqueValues(data, 'categoria'),
        vendedores: vendedoresOptions,
        regionais: GoogleSheetsService.extractUniqueValues(data, 'regional'),
        tiposCliente: GoogleSheetsService.extractUniqueValues(data, 'tipoCliente')
      });
      
      // Aplicar filtros automáticos por perfil
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

      // Sara e João travam regionais 2 e 3
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

      // Exceção: gerente "João" deve ver vendas do vendedor "João" independente de regional
      const norm = (s: string) => (s || '').normalize('NFD').replace(/\[\u0300-\u036f]/g, '').toLowerCase();
      const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
      const vendorsSelected = filtersToApply.vendedor || undefined;
      const extraJoao = isJoaoGerente
        ? data.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
        : [];
      const combined = Array.from(new Set([...filteredData, ...extraJoao]));

      setFilteredData(combined);
      setIsConnected(true);
      
      // Perform initial analysis with filtered data
      performAnalysis(filteredData);
      
      toast({
        title: "Conexão estabelecida!",
        description: `${filteredData.length} registros carregados com sucesso.`,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setConnectionError(errorMessage);
      toast({
        title: "Erro de conexão",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Apply filters and re-analyze
  const handleApplyFilters = () => {
    if (!googleSheetsService) return;
    
    setIsAnalyzing(true);
    
    try {
      const filtered = GoogleSheetsService.filterData(rawData, activeFilters);
      // Exceção: gerente "João" deve ver vendas do vendedor "João" independente de regional
      const norm = (s: string) => (s || '').normalize('NFD').replace(/\[\u0300-\u036f]/g, '').toLowerCase();
      const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
      const vendorsSelected = activeFilters.vendedor || undefined;
      const extraJoao = isJoaoGerente
        ? rawData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
        : [];
      const combined = Array.from(new Set([...filtered, ...extraJoao]));

      setFilteredData(combined);
      performAnalysis(filtered);
      
      toast({
        title: "Filtros aplicados",
        description: `Analisando ${filtered.length} registros filtrados.`,
      });
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: "Erro ao aplicar filtros e analisar dados.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear all filters
  // Clear all filters
  const handleClearFilters = () => {
    let clearedFilters: ActiveFilters = {};
    
    // Se o usuário for vendedor, manter o filtro de vendedor
    if (user && user.role === 'vendedor' && user.vendedor && ((user.username || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')) !== 'sara') {
      clearedFilters = { vendedor: [user.vendedor] };
    }

    // Manter regional travada
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
        (clearedFilters as ActiveFilters).regional = wantsTwoThree ? [pickRegional('2'), pickRegional('3')] : [
          unNorm === 'rodrigo' ? pickRegional('4') : (unNorm === 'sandro' ? pickRegional('1') : pickRegional('3'))
        ];
      }
    }

    setActiveFilters(clearedFilters);
    
    // Aplicar os filtros (se houver) aos dados
    let dataToAnalyze = rawData;
    if (Object.keys(clearedFilters).length > 0) {
      dataToAnalyze = GoogleSheetsService.filterData(rawData, clearedFilters);
    }
    // Exceção João gerente
    const norm = (s: string) => (s || '').normalize('NFD').replace(/\[\u0300-\u036f]/g, '').toLowerCase();
    const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
    const vendorsSelected = (clearedFilters as ActiveFilters).vendedor || undefined;
    const extraJoao = isJoaoGerente
      ? rawData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
      : [];
    const combined = Array.from(new Set([...dataToAnalyze, ...extraJoao]));
    
    setFilteredData(combined);
    performAnalysis(combined);
    
    const unTo = (user?.username || '').toLowerCase();
    const unToNorm = unTo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    toast({
      title: "Filtros limpos",
      description: user?.role === 'vendedor' 
        ? "Filtros limpos. Filtro de vendedor mantido."
        : (user?.role === 'gerente' || unToNorm === 'sara')
          ? (unToNorm === 'joao' || unToNorm === 'sara' ? "Filtros limpos. Regionais 2 e 3 mantidas." : (unToNorm === 'rodrigo' ? "Filtros limpos. Regional 4 mantida." : (unToNorm === 'sandro' ? "Filtros limpos. Regional 1 mantida." : "Filtros limpos. Regional 3 mantida.")))
          : "Mostrando todos os dados disponíveis.",
    });
  };

  // Perform Pareto analysis
  const performAnalysis = (data: SalesData[]) => {
    const analysis = ParetoAnalysisService.performAnalysis(data);
    setParetoClients(analysis.clients);
    setMetrics(analysis.metrics);
    setChartData(analysis.chartData);
  };

  // Export data
  // Remover a função handleExport
  const handleExport = () => {
    ParetoAnalysisService.downloadCSV(paretoClients, 'analise-pareto.csv');
    toast({
      title: "Dados exportados",
      description: "Arquivo CSV baixado com sucesso.",
    });
  };

  // Aplicar filtros automáticos baseados no usuário
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
      // Exceção João gerente
      const norm = (s: string) => (s || '').normalize('NFD').replace(/\[\u0300-\u036f]/g, '').toLowerCase();
      const isJoaoGerente = (user?.role === 'gerente' && norm(user?.username || '') === 'joao');
      const vendorsSelected = newFilters.vendedor || undefined;
      const extraJoao = isJoaoGerente
        ? rawData.filter(i => norm(i.vendedor) === 'joao' && (!vendorsSelected || vendorsSelected.includes(i.vendedor)))
        : [];
      const combined = Array.from(new Set([...filtered, ...extraJoao]));
      setFilteredData(combined);
      performAnalysis(combined);
    } else if (user && user.role === 'admin') {
      // Admin tem acesso total, limpar filtros específicos
      setActiveFilters({});
      if (rawData.length > 0) {
        setFilteredData(rawData);
        performAnalysis(rawData);
      }
    }
  }, [user, rawData]); // Adicionar rawData como dependência

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        {/* Configuration Section */}
        <GoogleSheetsConfig
          onConnect={handleConnect}
          isConnecting={isConnecting}
          isConnected={isConnected}
          error={connectionError}
        />

        {/* Analysis Section - Only show when connected */}
        {isConnected && (
          <>
            {/* Filters */}
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
                />
              )}
            </div>

            {/* Loading State */}
            {isAnalyzing && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-primary">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg font-medium">Processando análise Pareto...</span>
                </div>
              </div>
            )}

            {/* Results */}
            {!isAnalyzing && paretoClients.length > 0 && (
              <>
                {/* Metrics Dashboard */}
                <ParetoMetrics 
                  totalSales={metrics.totalSales}
                  topClientsCount={metrics.topClientsCount}
                  topClientsPercentage={metrics.topClientsPercentage}
                  totalClients={metrics.totalClients}
                  totalProducts={metrics.totalProducts}
                />

                {/* Chart */}
                {chartData.length > 0 && (
                  <ParetoChart data={chartData} />
                )}

                {/* Table */}
                <ParetoTable
                  data={paretoClients}
                />
              </>
            )}

            {/* Empty State */}
            {!isAnalyzing && paretoClients.length === 0 && rawData.length > 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                  <p>Tente ajustar os filtros para obter resultados.</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Getting Started Guide */}
        {!isConnected && (
          <div className="bg-card rounded-lg p-8 shadow-card">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl font-semibold mb-4">Como começar</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>1. Clique em conectar e Carregar</p>
                <p>2. Defina os filtros desejados</p>
                <p>3. Clique em Aplicar Análise</p>
  
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
