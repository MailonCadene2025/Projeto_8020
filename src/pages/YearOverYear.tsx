import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { YearOverYearFilters, YearOverYearFilterOptions, ActiveYearOverYearFilters } from '@/components/YearOverYearFilters';
import { GoogleSheetsService, HistoryData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

interface YearOverYearData {
  nomeFantasia: string;
  vendedor: string;
  categoria: string;
  regional: string;
  uf: string;
  cidade: string;
  totalProdutos2024: number;
  totalItens2024: number;
  faturamento2024: number;
  totalProdutos2025: number;
  totalItens2025: number;
  faturamento2025: number;
  crescimentoPercentual: number;
}

const YearOverYear = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rawData, setRawData] = useState<HistoryData[]>([]);
  const [data, setData] = useState<YearOverYearData[]>([]);
  const [filteredData, setFilteredData] = useState<YearOverYearData[]>([]);
  const [sortKey, setSortKey] = useState<keyof YearOverYearData | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<YearOverYearFilterOptions>({ clientes: [], categorias: [], regionais: [], estados: [], cidades: [], vendedores: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveYearOverYearFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const service = new GoogleSheetsService(API_KEY, SHEET_ID);
        const historyData = await service.fetchHistoryData();
        setRawData(historyData);
        
        // Processar dados para comparativo anual
        const yearOverYearData = processYearOverYearData(historyData);
        setData(yearOverYearData);
        
        // Extract filter options
        const extractUnique = (data: HistoryData[], key: keyof HistoryData) => [...new Set(data.map(item => item[key]).filter(Boolean))] as string[];

        // Filtrar opções de vendedores baseado no papel do usuário
        const allVendedores = extractUnique(historyData, 'vendedor').sort();
        const vendedoresOptions = user && user.role === 'vendedor' && user.vendedor 
          ? [user.vendedor]
          : allVendedores;

        setFilterOptions({
          clientes: extractUnique(historyData, 'nomeFantasia').sort(),
          categorias: extractUnique(historyData, 'categoria').sort(),
          regionais: extractUnique(historyData, 'regional').sort(),
          estados: extractUnique(historyData, 'uf').sort(),
          cidades: extractUnique(historyData, 'cidade').sort(),
          vendedores: vendedoresOptions,
        });

        // Aplicar filtros automáticos para vendedor
        let initialFilteredData = yearOverYearData;
        let initialFilters: ActiveYearOverYearFilters = {};
        
        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters.vendedor = user.vendedor;
          initialFilteredData = yearOverYearData.filter(item => item.vendedor === user.vendedor);
        }

        setActiveFilters(initialFilters);
        setFilteredData(initialFilteredData);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do comparativo anual.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const processYearOverYearData = (historyData: HistoryData[]): YearOverYearData[] => {
    const clientMap = new Map<string, YearOverYearData>();

    historyData.forEach(item => {
      if (!item.dataPedido || !item.nomeFantasia) return;
      
      const year = new Date(item.dataPedido.split('/').reverse().join('-')).getFullYear();
      if (year !== 2024 && year !== 2025) return;

      const clientName = item.nomeFantasia;
      if (!clientMap.has(clientName)) {
        clientMap.set(clientName, {
          nomeFantasia: clientName,
          vendedor: item.vendedor || '',
          categoria: item.categoria || '',
          regional: item.regional || '',
          uf: item.uf || '',
          cidade: item.cidade || '',
          totalProdutos2024: 0,
          totalItens2024: 0,
          faturamento2024: 0,
          totalProdutos2025: 0,
          totalItens2025: 0,
          faturamento2025: 0,
          crescimentoPercentual: 0,
        });
      }

      const client = clientMap.get(clientName)!;
      const quantidade = item.quantidade || 0;
      const valor = item.valor || 0;

      if (year === 2024) {
        client.totalProdutos2024 += 1;
        client.totalItens2024 += quantidade;
        client.faturamento2024 += valor;
      } else if (year === 2025) {
        client.totalProdutos2025 += 1;
        client.totalItens2025 += quantidade;
        client.faturamento2025 += valor;
      }
    });

    // Calcular percentual de crescimento
    const result = Array.from(clientMap.values()).map(client => {
      const crescimento = client.faturamento2024 > 0 
        ? ((client.faturamento2025 - client.faturamento2024) / client.faturamento2024) * 100
        : client.faturamento2025 > 0 ? 100 : 0;
      
      return {
        ...client,
        crescimentoPercentual: crescimento,
      };
    });

    return result.sort((a, b) => b.faturamento2025 - a.faturamento2025);
  };

  const handleApplyFilters = () => {
    let filtered = data.filter(item => {
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
    let clearedFilters = {};
    
    if (user && user.role === 'vendedor' && user.vendedor) {
      clearedFilters = { vendedor: user.vendedor };
    }
    
    setActiveFilters(clearedFilters);
    
    // Aplicar os filtros (se houver) aos dados
    let dataToShow = data;
    if (Object.keys(clearedFilters).length > 0) {
      dataToShow = data.filter(item => {
        if ('vendedor' in clearedFilters && item.vendedor !== (clearedFilters as { vendedor: string }).vendedor) return false;
        return true;
      });
    }
    
    setFilteredData(dataToShow);
    
    toast({
      title: "Filtros limpos",
      description: user?.role === 'vendedor' 
        ? "Filtros limpos. Filtro de vendedor mantido."
        : "Mostrando todos os dados disponíveis.",
    });
  };

  const handleBackToPareto = () => {
    navigate('/');
  };

  const getComparable = (item: YearOverYearData, key: keyof YearOverYearData) => {
    if (
      key === 'totalProdutos2024' ||
      key === 'totalItens2024' ||
      key === 'faturamento2024' ||
      key === 'totalProdutos2025' ||
      key === 'totalItens2025' ||
      key === 'faturamento2025' ||
      key === 'crescimentoPercentual'
    ) {
      return item[key] as number;
    }
    return String(item[key] || '').toLowerCase();
  };

  const handleSort = (key: keyof YearOverYearData) => {
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

  // Dados para o gráfico
  const chartData = filteredData.slice(0, 10).map(item => ({
    name: item.nomeFantasia.substring(0, 15) + (item.nomeFantasia.length > 15 ? '...' : ''),
    '2024': item.faturamento2024,
    '2025': item.faturamento2025,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={handleBackToPareto}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para 80/20
          </Button>
          <h1 className="text-2xl font-bold">Comparativo Year Over Year - 2024 vs 2025</h1>
        </div>
        
        <YearOverYearFilters 
          options={filterOptions} 
          activeFilters={activeFilters} 
          onFilterChange={setActiveFilters} 
          onApply={handleApplyFilters} 
          onClear={handleClearFilters} 
        />
        
        {/* Gráfico de Evolução */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gráfico de Evolução - Top 10 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="line"
                  wrapperStyle={{
                    paddingBottom: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2024" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  name="2024 (Ano Anterior)" 
                  dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2025" 
                  stroke="#22c55e" 
                  strokeWidth={3} 
                  name="2025 (Ano Atual)" 
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#22c55e', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomeFantasia')}>
                  <div className="flex items-center gap-1">
                    <span>Nome da Revenda</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'nomeFantasia' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('totalProdutos2024')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Produtos 2024</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'totalProdutos2024' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('totalItens2024')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Itens 2024</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'totalItens2024' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('faturamento2024')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Faturamento 2024</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'faturamento2024' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('totalProdutos2025')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Produtos 2025</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'totalProdutos2025' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('totalItens2025')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Itens 2025</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'totalItens2025' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('faturamento2025')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Faturamento 2025</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'faturamento2025' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('crescimentoPercentual')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>% Crescimento</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    {sortKey === 'crescimentoPercentual' && (
                      <span className="text-xs text-muted-foreground">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.nomeFantasia}</TableCell>
                  <TableCell className="text-right">{item.totalProdutos2024}</TableCell>
                  <TableCell className="text-right">{item.totalItens2024}</TableCell>
                  <TableCell className="text-right">{item.faturamento2024.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className="text-right">{item.totalProdutos2025}</TableCell>
                  <TableCell className="text-right">{item.totalItens2025}</TableCell>
                  <TableCell className="text-right">{item.faturamento2025.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    item.crescimentoPercentual > 0 ? 'text-green-600' : 
                    item.crescimentoPercentual < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {item.crescimentoPercentual > 0 ? '+' : ''}{item.crescimentoPercentual.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default YearOverYear;