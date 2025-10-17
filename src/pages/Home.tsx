import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { GoogleSheetsConfig } from '@/components/GoogleSheetsConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSheetsService, SalesData, HistoryData } from '@/services/googleSheetsService';
import { ParetoAnalysisService } from '@/services/paretoAnalysisService';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, TrendingUp, CalendarClock, ArrowRight } from 'lucide-react';

interface InactiveTopClient {
  nomeFantasia: string;
  vendasTotais: number;
  ultimoPedido: Date;
  diasSemCompra: number;
}

interface YoYGrowthClient {
  nomeFantasia: string;
  crescimentoPercentual: number;
  faturamentoAnterior: number;
  faturamentoAtual: number;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [service, setService] = useState<GoogleSheetsService>();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [inactiveTop, setInactiveTop] = useState<InactiveTopClient[]>([]);
  const [yoyTopGrowth, setYoyTopGrowth] = useState<YoYGrowthClient[]>([]);

  const handleConnect = async (apiKey: string, sheetId: string) => {
    setIsConnecting(true);
    setConnectionError(undefined);

    try {
      const svc = new GoogleSheetsService(apiKey, sheetId);
      const vendas = await svc.fetchData();
      const historico = await svc.fetchHistoryData();

      // Filtrar por vendedor, se aplicável
      let vendasFiltradas = vendas;
      let historicoFiltrado = historico;
      if (user && user.role === 'vendedor' && user.vendedor) {
        vendasFiltradas = vendas.filter(d => d.vendedor === user.vendedor);
        historicoFiltrado = historico.filter(d => d.vendedor === user.vendedor);
      }

      setService(svc);
      setSalesData(vendasFiltradas);
      setHistoryData(historicoFiltrado);
      setIsConnected(true);

      // Calcular alertas
      computeAlerts(vendasFiltradas, historicoFiltrado);

      toast({
        title: 'Conexão estabelecida!',
        description: `${vendasFiltradas.length} registros de vendas e ${historicoFiltrado.length} registros de histórico carregados.`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setConnectionError(msg);
      toast({ title: 'Erro de conexão', description: msg, variant: 'destructive' });
    } finally {
      setIsConnecting(false);
    }
  };

  const computeAlerts = (vendas: SalesData[], historico: HistoryData[]) => {
    // Alertas: Clientes TOP 20% inativos há 90+ dias
    try {
      const analysis = ParetoAnalysisService.performAnalysis(vendas, {});
      const topClients = analysis.clients.filter(c => c.classificacao === 'TOP_20');
      const now = new Date();

      const inativos: InactiveTopClient[] = topClients
        .map(c => {
          const last = c.ultimoPedido ? new Date(c.ultimoPedido) : new Date(0);
          const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          return {
            nomeFantasia: c.nomeFantasia,
            vendasTotais: c.vendasTotais,
            ultimoPedido: last,
            diasSemCompra: days,
          };
        })
        .filter(c => c.diasSemCompra >= 90)
        .sort((a, b) => b.vendasTotais - a.vendasTotais)
        .slice(0, 5);

      setInactiveTop(inativos);
    } catch (e) {
      console.error('Erro ao calcular inativos TOP 20%:', e);
    }

    // Alertas: Clientes com maior % de crescimento YoY (2024 vs 2025)
    try {
      const map = new Map<string, { fat24: number; fat25: number }>();
      historico.forEach(h => {
        const date = new Date(h.dataPedido.split('/').reverse().join('-'));
        const year = date.getFullYear();
        const curr = map.get(h.nomeFantasia) || { fat24: 0, fat25: 0 };
        if (year === 2024) curr.fat24 += h.valor || 0;
        else if (year === 2025) curr.fat25 += h.valor || 0;
        map.set(h.nomeFantasia, curr);
      });

      const growth: YoYGrowthClient[] = Array.from(map.entries()).map(([nome, vals]) => {
        let crescimento = 0;
        if (vals.fat24 > 0) {
          crescimento = ((vals.fat25 - vals.fat24) / vals.fat24) * 100;
        } else if (vals.fat25 > 0) {
          crescimento = 100; // Sem base em 2024 e faturou em 2025
        } else {
          crescimento = 0;
        }
        return {
          nomeFantasia: nome,
          crescimentoPercentual: crescimento,
          faturamentoAnterior: vals.fat24,
          faturamentoAtual: vals.fat25,
        };
      })
        .filter(c => c.crescimentoPercentual > 0)
        .sort((a, b) => b.crescimentoPercentual - a.crescimentoPercentual)
        .slice(0, 5);

      setYoyTopGrowth(growth);
    } catch (e) {
      console.error('Erro ao calcular crescimento YoY:', e);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) return '—';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        {/* Hero / Conexão */}
        <GoogleSheetsConfig
          onConnect={handleConnect}
          isConnecting={isConnecting}
          isConnected={isConnected}
          error={connectionError}
        />

        {/* Alertas estratégicos */}
        {isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inativos TOP 20% */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Clientes TOP 20% inativos (90+ dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inactiveTop.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nenhum cliente TOP 20% inativo encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {inactiveTop.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-border/50 pb-3">
                        <div>
                          <div className="font-medium">{c.nomeFantasia}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <CalendarClock className="h-3 w-3" /> Última compra: {formatDate(c.ultimoPedido)}
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{c.diasSemCompra} dias</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{formatCurrency(c.vendasTotais)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/history')}>
                    Ver histórico
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Maior crescimento YoY */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Clientes com maior % de crescimento (YoY)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yoyTopGrowth.length === 0 ? (
                  <div className="text-muted-foreground text-sm">Nenhum cliente com crescimento positivo encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {yoyTopGrowth.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-border/50 pb-3">
                        <div>
                          <div className="font-medium">{c.nomeFantasia}</div>
                          <div className="text-xs text-muted-foreground">
                            Crescimento: <span className="font-medium text-emerald-700">+{c.crescimentoPercentual.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div>2024: {formatCurrency(c.faturamentoAnterior)}</div>
                          <div>2025: {formatCurrency(c.faturamentoAtual)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/year-over-year')}>
                    Ver Year Over Year
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Ajuda rápida antes da conexão */}
        {!isConnected && (
          <div className="bg-card rounded-lg p-8 shadow-card">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-xl font-semibold mb-4">Como começar</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>1. Clique em Conectar e Carregar</p>
                <p>2. Após carregar, veja os alertas estratégicos principais</p>
                <p>3. Explore 80/20, Histórico e Year Over Year</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;