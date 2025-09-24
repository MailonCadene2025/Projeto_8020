import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig } from '@/components/GoogleSheetsConfig';
import { ParetoFilters, FilterOptions, ActiveFilters } from '@/components/ParetoFilters';
import { ParetoMetrics } from '@/components/ParetoMetrics';
import { ParetoTable, ParetoClient } from '@/components/ParetoTable';
import { ParetoChart } from '@/components/ParetoChart';
import { GoogleSheetsService, SalesData } from '@/services/googleSheetsService';
import { ParetoAnalysisService } from '@/services/paretoAnalysisService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3, Wifi, WifiOff } from 'lucide-react';

const Index = () => {
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
    totalClients: 0
  });
  const [chartData, setChartData] = useState<Array<{
    cliente: string;
    vendas: number;
    percentualAcumulado: number;
    percentualIndividual: number;
  }>>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      setFilteredData(data);
      setIsConnected(true);
      
      // Build filter options
      setFilterOptions({
        clientes: GoogleSheetsService.extractUniqueValues(data, 'nomeFantasia'),
        cidades: GoogleSheetsService.extractUniqueValues(data, 'cidade'),
        estados: GoogleSheetsService.extractUniqueValues(data, 'uf'),
        categorias: GoogleSheetsService.extractUniqueValues(data, 'categoria'),
        vendedores: GoogleSheetsService.extractUniqueValues(data, 'vendedor'),
        regionais: GoogleSheetsService.extractUniqueValues(data, 'regional'),
        tiposCliente: GoogleSheetsService.extractUniqueValues(data, 'tipoCliente')
      });
      
      // Perform initial analysis
      performAnalysis(data);
      
      toast({
        title: "Conexão estabelecida!",
        description: `${data.length} registros carregados com sucesso.`,
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
      setFilteredData(filtered);
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
  const handleClearFilters = () => {
    setActiveFilters({});
    setFilteredData(rawData);
    performAnalysis(rawData);
    
    toast({
      title: "Filtros limpos",
      description: "Mostrando todos os dados disponíveis.",
    });
  };

  // Perform Pareto analysis
  const performAnalysis = (data: SalesData[]) => {
    const analysis = ParetoAnalysisService.performAnalysis(data, activeFilters);
    setParetoClients(analysis.clients);
    setMetrics(analysis.metrics);
    setChartData(analysis.chartData);
  };

  // Export data
  const handleExport = () => {
    ParetoAnalysisService.downloadCSV(paretoClients, 'analise-pareto.csv');
    toast({
      title: "Dados exportados",
      description: "Arquivo CSV baixado com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-background border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://i.ibb.co/BpTtpvT/logo3.png" alt="logo3" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Sistema de Análise Pareto 80/20
                </h1>
                <p className="text-sm text-muted-foreground">
                  Análise inteligente de vendas com dados do Google Sheets
                </p>
              </div>
            </div>
            
            
            
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <Wifi className="h-4 w-4" />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <WifiOff className="h-4 w-4" />
                  Não conectado
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
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
            <ParetoFilters
              filterOptions={filterOptions}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              isLoading={isAnalyzing}
            />

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
                />

                {/* Chart */}
                {chartData.length > 0 && (
                  <ParetoChart data={chartData} />
                )}

                {/* Table */}
                <ParetoTable
                  data={paretoClients}
                  onExport={handleExport}
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
                <p>4. Se desejar, exporte para CSV clicando acima da tabela no botão de export</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
