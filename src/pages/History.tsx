import React, { useState, useEffect } from 'react';
import { HistoryFilters, HistoryFilterOptions, ActiveHistoryFilters } from '@/components/HistoryFilters';
import { GoogleSheetsService, HistoryData } from '@/services/googleSheetsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const API_KEY = 'AIzaSyCd7d1FcI_61TgM_WB6G4T9ao7BkHT45J8';
const SHEET_ID = '1p7cRvyWsNQmZRrvWPKU2Wxx380jzqxMKhmgmsvTZ0u8';

const History = () => {
  const { user } = useAuth();
  const [data, setData] = useState<HistoryData[]>([]);
  const [filteredData, setFilteredData] = useState<HistoryData[]>([]);
  const [filterOptions, setFilterOptions] = useState<HistoryFilterOptions>({ clientes: [], categorias: [], regionais: [], estados: [], cidades: [], vendedores: [] });
  const [activeFilters, setActiveFilters] = useState<ActiveHistoryFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
          clientes: extractUnique(historyData, 'nomeFantasia').sort(),
          categorias: extractUnique(historyData, 'categoria').sort(),
          regionais: extractUnique(historyData, 'regional').sort(),
          estados: extractUnique(historyData, 'uf').sort(),
          cidades: extractUnique(historyData, 'cidade').sort(),
          vendedores: vendedoresOptions,
        });

        // Aplicar filtro automático se for vendedor
        let initialFilteredData = historyData;
        let initialFilters = {};
        
        if (user && user.role === 'vendedor' && user.vendedor) {
          initialFilters = { vendedor: user.vendedor };
          initialFilteredData = historyData.filter(item => item.vendedor === user.vendedor);
          setActiveFilters(initialFilters);
        }
        
        setFilteredData(initialFilteredData);

      } catch (error) {
        toast({ title: 'Erro ao buscar dados', description: (error as Error).message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, user]);

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
    let clearedFilters = {};
    
    // Se o usuário for vendedor, manter o filtro de vendedor
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Histórico de Compras 2024/2025</h1>
      <HistoryFilters options={filterOptions} activeFilters={activeFilters} onFilterChange={setActiveFilters} onApply={handleApplyFilters} onClear={handleClearFilters} />
      {isLoading ? <p>Carregando...</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Pedido</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Forma de Pagamento</TableHead>
              <TableHead>NF-</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>REGIONAL</TableHead>
              <TableHead>Qtdde</TableHead>
              <TableHead>VALOR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.dataPedido}</TableCell>
                <TableCell>{item.nomeFantasia}</TableCell>
                <TableCell>{item.cidade}</TableCell>
                <TableCell>{item.uf}</TableCell>
                <TableCell>{item.categoria}</TableCell>
                <TableCell>{item.formaPagamento}</TableCell>
                <TableCell>{item.nf}</TableCell>
                <TableCell>{item.vendedor}</TableCell>
                <TableCell>{item.regional}</TableCell>
                <TableCell>{item.quantidade}</TableCell>
                <TableCell>{item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default History;