import { SalesData } from './googleSheetsService';
import { ParetoClient } from '../components/ParetoTable';

interface ClientSummary {
  nomeFantasia: string;
  cidade: string;
  uf: string;
  vendasTotais: number;
  totalPedidos: number;
  totalItens: number;
  ultimoPedido: Date;
  vendedores: Record<string, number>;
  categorias: Record<string, number>;
}

interface ParetoMetrics {
  totalSales: number;
  topClientsCount: number;
  topClientsPercentage: number;
  totalClients: number;
}

interface ActiveFilters {
  categoria?: string;
}

export class ParetoAnalysisService {
  static performAnalysis(salesData: SalesData[], activeFilters: ActiveFilters = {}): {
    clients: ParetoClient[];
    metrics: ParetoMetrics;
    chartData: Array<{
      cliente: string;
      vendas: number;
      percentualAcumulado: number;
      percentualIndividual: number;
    }>;
  } {
    if (salesData.length === 0) {
      return {
        clients: [],
        metrics: { totalSales: 0, topClientsCount: 0, topClientsPercentage: 0, totalClients: 0 },
        chartData: []
      };
    }

    // Group data by client
    const clientSummaries = this.groupByClient(salesData);
    
    // Sort by total sales (descending)
    const sortedClients = Object.values(clientSummaries)
      .sort((a, b) => b.vendasTotais - a.vendasTotais);

    // Calculate totals
    const totalSales = sortedClients.reduce((sum, client) => sum + client.vendasTotais, 0);
    const totalClients = sortedClients.length;

    // Calculate Pareto classification
    let cumulativeSum = 0;
    let topClientsCount = 0;
    const paretoClients: ParetoClient[] = [];

    sortedClients.forEach((client, index) => {
      const percentualIndividual = (client.vendasTotais / totalSales) * 100;
      cumulativeSum += client.vendasTotais;
      const percentualAcumulado = (cumulativeSum / totalSales) * 100;
      
      // Determine if this client is in the top 20% (80% of revenue)
      const classificacao: 'TOP_20' | 'DEMAIS_80' = percentualAcumulado <= 80 ? 'TOP_20' : 'DEMAIS_80';
      
      if (classificacao === 'TOP_20') {
        topClientsCount++;
      }

      paretoClients.push({
        nomeFantasia: client.nomeFantasia,
        cidade: client.cidade,
        uf: client.uf,
        vendedorPrincipal: this.getMostFrequent(client.vendedores),
        categoriaPrincipal: activeFilters.categoria ? this.getMostFrequent(client.categorias) : 'Todos',
        vendasTotais: client.vendasTotais,
        percentualIndividual,
        percentualAcumulado,
        classificacao,
        ultimoPedido: client.ultimoPedido.toISOString().split('T')[0],
        totalPedidos: client.totalPedidos,
        totalItens: client.totalItens,
      });
    });

    // Calculate top 20% metrics
    const topClients = paretoClients.filter(c => c.classificacao === 'TOP_20');
    const topClientsRevenue = topClients.reduce((sum, client) => sum + client.vendasTotais, 0);
    const topClientsPercentage = (topClientsRevenue / totalSales) * 100;

    // Prepare chart data (top 20 clients for visibility)
    const chartData = paretoClients.slice(0, 20).map(client => ({
      cliente: this.truncateClientName(client.nomeFantasia),
      vendas: client.vendasTotais,
      percentualAcumulado: client.percentualAcumulado,
      percentualIndividual: client.percentualIndividual
    }));

    return {
      clients: paretoClients,
      metrics: {
        totalSales,
        topClientsCount,
        topClientsPercentage,
        totalClients
      },
      chartData
    };
  }

  private static groupByClient(salesData: SalesData[]): Record<string, ClientSummary> {
    const clientMap: Record<string, ClientSummary> = {};

    salesData.forEach(sale => {
      const key = sale.nomeFantasia;
      
      if (!clientMap[key]) {
        clientMap[key] = {
          nomeFantasia: sale.nomeFantasia,
          cidade: sale.cidade,
          uf: sale.uf,
          vendasTotais: 0,
          totalPedidos: 0,
          totalItens: 0,
          ultimoPedido: new Date(0),
          vendedores: {},
          categorias: {}
        };
      }

      const client = clientMap[key];
      
      // Update totals
      client.vendasTotais += sale.valor;
      client.totalPedidos += 1;
      client.totalItens += sale.quantidade;
      
      // Update last order date
      const saleDate = this.parseDate(sale.dataPedido);
      if (saleDate && saleDate > client.ultimoPedido) {
        client.ultimoPedido = saleDate;
      }
      
      // Track vendors and categories frequency
      client.vendedores[sale.vendedor] = (client.vendedores[sale.vendedor] || 0) + 1;
      client.categorias[sale.categoria] = (client.categorias[sale.categoria] || 0) + 1;
    });

    return clientMap;
  }

  private static parseDate(dateString: string): Date {
    if (!dateString) return new Date(0);
    
    // Handle DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return new Date(dateString);
  }

  private static getMostFrequent(counter: Record<string, number>): string {
    let maxCount = 0;
    let mostFrequent = '';
    
    Object.entries(counter).forEach(([key, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = key;
      }
    });
    
    return mostFrequent || 'N/A';
  }

  private static truncateClientName(name: string, maxLength: number = 15): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }

  static exportToCSV(clients: ParetoClient[]): string {
    const headers = [
      'Cliente',
      'Cidade',
      'UF',
      'Vendedor Principal',
      'Categoria Principal',
      'Vendas Totais',
      '% Individual',
      '% Acumulado',
      'Classificação',
      'Último Pedido',
      'Total Pedidos',
      'Total Itens'
    ];

    const csvRows = [headers.join(',')];
    
    clients.forEach(client => {
      const row = [
        `"${client.nomeFantasia}"`,
        client.cidade,
        client.uf,
        `"${client.vendedorPrincipal}"`,
        `"${client.categoriaPrincipal}"`,
        client.vendasTotais.toFixed(2),
        client.percentualIndividual.toFixed(2),
        client.percentualAcumulado.toFixed(2),
        client.classificacao === 'TOP_20' ? 'TOP 20%' : 'Demais 80%',
        client.ultimoPedido,
        client.totalPedidos,
        client.totalItens
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  static downloadCSV(clients: ParetoClient[], filename: string = 'analise-pareto.csv'): void {
    const csvContent = this.exportToCSV(clients);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}