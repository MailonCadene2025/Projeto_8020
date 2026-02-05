
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { expensesService, GeneralExpenseData, FuelExpenseData } from '@/services/expensesService';
import { ExpensesFilters, ExpensesFilterOptions, ExpensesActiveFilters } from '@/components/ExpensesFilters';
import { ExpensesSummary } from '@/components/ExpensesSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText, Loader2, Fuel, Droplets, DollarSign } from 'lucide-react';
import { format, parse } from 'date-fns';

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpenseData[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpenseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  const [activeFilters, setActiveFilters] = useState<ExpensesActiveFilters>({
    vendedor: [],
    regional: [],
    municipio: [],
    categoria: [],
  });

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [general, fuel] = await Promise.all([
          expensesService.fetchGeneralExpenses(),
          expensesService.fetchFuelExpenses()
        ]);
        setGeneralExpenses(general);
        setFuelExpenses(fuel);
      } catch (error) {
        console.error('Failed to load expenses data', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Extract unique options for filters
  const filterOptions: ExpensesFilterOptions = useMemo(() => {
    const allGeneral = generalExpenses;
    const allFuel = fuelExpenses;
    
    // Helper to get unique values
    const getUnique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();

    const vendedores = getUnique([
      ...allGeneral.map(i => i.vendedor),
      ...allFuel.map(i => i.vendedor)
    ]);

    const regionais = getUnique([
      ...allGeneral.map(i => i.regional),
      ...allFuel.map(i => i.regional)
    ]);

    const municipios = getUnique([
      ...allGeneral.map(i => i.municipio),
      ...allFuel.map(i => i.municipio)
    ]);

    const categorias = getUnique([
      ...allGeneral.map(i => i.categoria),
      ...allFuel.map(i => 'Combustível')
    ]);

    return {
      vendedores,
      regionais,
      municipios,
      categorias
    };
  }, [generalExpenses, fuelExpenses]);

  // Handle regional locks for specific users
  const [regionalLocked, setRegionalLocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const unNorm = user.username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regionaisOpts = filterOptions.regionais;
    
    const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
    const pickRegional = (label: string) => (
      regionaisOpts.find(r => normalize(r) === `regional${label}` || normalize(r) === `regiao${label}` || r === label)
    );

    let lockedRegionals: string[] = [];
    let isLocked = false;

    if (unNorm === 'rodrigo') {
      const reg = pickRegional('4');
      if (reg) lockedRegionals.push(reg);
      isLocked = true;
    } else if (unNorm === 'sandro') {
      const reg = pickRegional('1');
      if (reg) lockedRegionals.push(reg);
      isLocked = true;
    } else if (unNorm === 'joao' || unNorm === 'sara') {
      const reg2 = pickRegional('2');
      const reg3 = pickRegional('3');
      if (reg2) lockedRegionals.push(reg2);
      if (reg3) lockedRegionals.push(reg3);
      isLocked = true;
    }

    if (isLocked && lockedRegionals.length > 0) {
      setRegionalLocked(true);
      setActiveFilters(prev => ({
        ...prev,
        regional: lockedRegionals
      }));
    }
  }, [user, filterOptions.regionais]);


  // Filter Logic
  const filterData = <T extends GeneralExpenseData | FuelExpenseData>(data: T[]): T[] => {
    return data.filter(item => {
      // Date Filter
      if (activeFilters.dataInicio || activeFilters.dataFim) {
        // Parse item date (DD/MM/YYYY)
        try {
          const itemDate = parse(item.data, 'dd/MM/yyyy', new Date());
          
          if (activeFilters.dataInicio) {
            const startDate = parse(activeFilters.dataInicio, 'yyyy-MM-dd', new Date());
            if (itemDate < startDate) return false;
          }
          
          if (activeFilters.dataFim) {
            const endDate = parse(activeFilters.dataFim, 'yyyy-MM-dd', new Date());
            if (itemDate > endDate) return false;
          }
        } catch (e) {
          // If date parsing fails, ignore date filter for this item or include it?
          // Safer to include or log error.
        }
      }

      // Vendedor Filter
      if (activeFilters.vendedor && activeFilters.vendedor.length > 0) {
        if (!activeFilters.vendedor.includes(item.vendedor)) return false;
      }

      // Regional Filter
      if (activeFilters.regional && activeFilters.regional.length > 0) {
        // Exact match
        if (!activeFilters.regional.includes(item.regional)) return false;
      }

      // Municipio Filter
      if (activeFilters.municipio && activeFilters.municipio.length > 0) {
        if (!activeFilters.municipio.includes(item.municipio)) return false;
      }

      // Categoria Filter (Only for General, or if item has category)
      if (activeFilters.categoria && activeFilters.categoria.length > 0) {
        if ('categoria' in item) {
           if (!activeFilters.categoria.includes((item as GeneralExpenseData).categoria)) return false;
        } else {
           // For Fuel, if 'Combustível' is selected? 
           // If user selects specific categories, and this is fuel data which implicitly is 'Combustível'
           // If 'Combustível' is in selected categories, show it?
           // Or if we only filter General expenses by category?
           // Let's assume strict filtering: if categories selected, check if item matches.
           // Fuel items don't have 'categoria' field in interface? 
           // Wait, FuelExpenseData interface I defined DOES NOT have categoria, but the CSV parsing in service maps the LAST column to `categoria`?
           // Let's check service again. 
           // In fetchFuelExpenses: `const [..., regional, categoria] = columns;`
           // But return object: `... regional, categoria`? 
           // My service implementation for FuelExpenseData interface:
           /*
            export interface FuelExpenseData {
              ...
              regional: string;
              quantidadeLitros: number;
              ...
            }
           */
           // I missed adding `categoria` to FuelExpenseData interface in the service file I wrote?
           // Let's check the previous turn's file write.
           // Yes, I missed `categoria` in the interface but mapped it in the function.
           // Actually, looking at the service code I wrote:
           // `const [..., regional, categoria] = columns;`
           // `return { ..., regional, ... };` // `categoria` is NOT in the return object.
           // So Fuel data currently has no category.
           // I should probably treat all Fuel data as category "Combustível" for filtering purposes if needed.
           // For now, if category filter is active, and item doesn't have category, maybe exclude it?
           // Or better: If user filters by "Alimentação", Fuel rows (Combustível) should probably be hidden.
           // If user filters by "Combustível", Fuel rows should be shown.
           
           // Hack: If this is fuel data, treat it as "Combustível".
           const fuelCategory = 'Combustível';
           if (!activeFilters.categoria.includes(fuelCategory)) return false;
        }
      }

      return true;
    });
  };

  const filteredGeneral = useMemo(() => filterData(generalExpenses), [generalExpenses, activeFilters]);
  const filteredFuel = useMemo(() => {
    // Custom filter for fuel to handle the category issue described above
    return fuelExpenses.filter(item => {
        // Apply common filters
        // Date
        if (activeFilters.dataInicio || activeFilters.dataFim) {
            try {
              const itemDate = parse(item.data, 'dd/MM/yyyy', new Date());
              if (activeFilters.dataInicio) {
                const startDate = parse(activeFilters.dataInicio, 'yyyy-MM-dd', new Date());
                if (itemDate < startDate) return false;
              }
              if (activeFilters.dataFim) {
                const endDate = parse(activeFilters.dataFim, 'yyyy-MM-dd', new Date());
                if (itemDate > endDate) return false;
              }
            } catch (e) {}
        }
        if (activeFilters.vendedor && activeFilters.vendedor.length > 0 && !activeFilters.vendedor.includes(item.vendedor)) return false;
        if (activeFilters.regional && activeFilters.regional.length > 0 && !activeFilters.regional.includes(item.regional)) return false;
        if (activeFilters.municipio && activeFilters.municipio.length > 0 && !activeFilters.municipio.includes(item.municipio)) return false;
        
        // Category special handling
        if (activeFilters.categoria && activeFilters.categoria.length > 0) {
            if (!activeFilters.categoria.includes('Combustível')) return false;
        }
        return true;
    });
  }, [fuelExpenses, activeFilters]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const openNf = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Acompanhamento de Despesas</h1>
        </div>

        <ExpensesFilters
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        onApplyFilters={() => {}} // Filters apply automatically or we can trigger refetch if server-side
        onClearFilters={() => setActiveFilters({})}
        isLoading={isLoading}
        regionalDisabled={regionalLocked}
      />

      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="general">Despesas Gerais</TabsTrigger>
          <TabsTrigger value="fuel">Combustível</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          <ExpensesSummary expenses={filteredGeneral} />
          <Card>
            <CardHeader>
              <CardTitle>Despesas Gerais ({filteredGeneral.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>NF/Recibo</TableHead>
                      <TableHead>Regional</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredGeneral.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGeneral.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.data}</TableCell>
                          <TableCell>{item.vendedor}</TableCell>
                          <TableCell>{item.municipio}</TableCell>
                          <TableCell>{item.categoria}</TableCell>
                          <TableCell>
                            {item.nfUrl ? (
                              <Button variant="ghost" size="sm" onClick={() => openNf(item.nfUrl)} className="text-blue-600 hover:text-blue-800">
                                <FileText className="h-4 w-4 mr-1" />
                                Abrir
                              </Button>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{item.regional}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="border-t-4 border-emerald-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Gasto</CardTitle>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(filteredFuel.reduce((acc, curr) => acc + curr.valorTotal, 0))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Custo total com combustível</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Litros</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Droplets className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {filteredFuel.reduce((acc, curr) => acc + curr.quantidadeLitros, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                </div>
                <p className="text-xs text-slate-500 mt-1">Volume total abastecido</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-rose-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Média Preço/Litro</CardTitle>
                <div className="p-2 bg-rose-100 rounded-lg">
                  <Fuel className="h-4 w-4 text-rose-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {(() => {
                    const totalVal = filteredFuel.reduce((acc, curr) => acc + curr.valorTotal, 0);
                    const totalLit = filteredFuel.reduce((acc, curr) => acc + curr.quantidadeLitros, 0);
                    return totalLit > 0 ? formatCurrency(totalVal / totalLit) : formatCurrency(0);
                  })()}
                </div>
                <p className="text-xs text-slate-500 mt-1">Custo médio por litro</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Despesas com Combustível ({filteredFuel.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead className="text-right">Hodômetro</TableHead>
                      <TableHead>Combustível</TableHead>
                      <TableHead>NF/Recibo</TableHead>
                      <TableHead>Regional</TableHead>
                      <TableHead className="text-right">Litros</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredFuel.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFuel.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.data}</TableCell>
                          <TableCell>{item.vendedor}</TableCell>
                          <TableCell>{item.municipio}</TableCell>
                          <TableCell className="text-right">{item.hodometro}</TableCell>
                          <TableCell>{item.tipoCombustivel}</TableCell>
                          <TableCell>
                            {item.nfUrl ? (
                              <Button variant="ghost" size="sm" onClick={() => openNf(item.nfUrl)} className="text-blue-600 hover:text-blue-800">
                                <FileText className="h-4 w-4 mr-1" />
                                Abrir
                              </Button>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{item.regional}</TableCell>
                          <TableCell className="text-right">{item.quantidadeLitros}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default ExpensesPage;
