import { SalesData } from './googleSheetsService';
import { ParetoProduct } from '../components/ParetoProductsTable';

interface CategorySummary {
  categoria: string;
  vendasTotais: number;
  totalPedidos: number;
  totalItens: number;
  ultimoPedido: Date;
  vendedores: Record<string, number>;
}

interface ParetoProductsMetrics {
  totalSales: number;
  topCategoriesCount: number;
  topCategoriesPercentage: number;
  totalCategories: number;
  totalProducts: number;
}

export class ParetoProductsAnalysisService {
  static performAnalysis(salesData: SalesData[]): {
    products: ParetoProduct[];
    metrics: ParetoProductsMetrics;
    chartData: Array<{
      categoria: string;
      vendas: number;
      percentualAcumulado: number;
      percentualIndividual: number;
    }>;
  } {
    if (salesData.length === 0) {
      return {
        products: [],
        metrics: { totalSales: 0, topCategoriesCount: 0, topCategoriesPercentage: 0, totalCategories: 0, totalProducts: 0 },
        chartData: []
      };
    }

    const categorySummaries = this.groupByCategory(salesData);

    // Sort by total sales (descending)
    const sortedCategories = Object.values(categorySummaries)
      .sort((a, b) => b.vendasTotais - a.vendasTotais);

    // Totals
    const totalSales = sortedCategories.reduce((sum, cat) => sum + cat.vendasTotais, 0);
    const totalCategories = sortedCategories.length;
    const totalProducts = salesData.reduce((sum, sale) => sum + sale.quantidade, 0);

    // Classification (include crossing category in TOP_20 until reaching >= 80%)
    let cumulativeSum = 0;
    let topCategoriesCount = 0;
    let reachedEighty = false;
    const paretoProducts: ParetoProduct[] = [];

    sortedCategories.forEach((cat) => {
      const percentualIndividual = (cat.vendasTotais / totalSales) * 100;
      cumulativeSum += cat.vendasTotais;
      const percentualAcumulado = (cumulativeSum / totalSales) * 100;

      let classificacao: 'TOP_20' | 'DEMAIS_80';
      if (!reachedEighty) {
        classificacao = 'TOP_20';
        if (percentualAcumulado >= 80) {
          reachedEighty = true;
        }
      } else {
        classificacao = 'DEMAIS_80';
      }

      if (classificacao === 'TOP_20') topCategoriesCount++;

      paretoProducts.push({
        categoria: cat.categoria,
        vendedorPrincipal: this.getMostFrequent(cat.vendedores),
        vendasTotais: cat.vendasTotais,
        percentualIndividual,
        percentualAcumulado,
        classificacao,
        ultimoPedido: cat.ultimoPedido.toISOString().split('T')[0],
        totalPedidos: cat.totalPedidos,
        totalItens: cat.totalItens,
      });
    });

    const topCategoriesRevenue = paretoProducts
      .filter(p => p.classificacao === 'TOP_20')
      .reduce((sum, p) => sum + p.vendasTotais, 0);
    const topCategoriesPercentage = (topCategoriesRevenue / totalSales) * 100;

    const chartData = paretoProducts.slice(0, 20).map(p => ({
      categoria: this.truncateLabel(p.categoria),
      vendas: p.vendasTotais,
      percentualAcumulado: p.percentualAcumulado,
      percentualIndividual: p.percentualIndividual,
    }));

    return {
      products: paretoProducts,
      metrics: {
        totalSales,
        topCategoriesCount,
        topCategoriesPercentage,
        totalCategories,
        totalProducts,
      },
      chartData,
    };
  }

  private static groupByCategory(salesData: SalesData[]): Record<string, CategorySummary> {
    const map: Record<string, CategorySummary> = {};

    salesData.forEach(sale => {
      const key = sale.categoria || 'N/A';
      if (!map[key]) {
        map[key] = {
          categoria: key,
          vendasTotais: 0,
          totalPedidos: 0,
          totalItens: 0,
          ultimoPedido: new Date(0),
          vendedores: {},
        };
      }

      const cat = map[key];
      cat.vendasTotais += sale.valor;
      cat.totalPedidos += 1;
      cat.totalItens += sale.quantidade;

      const saleDate = this.parseDate(sale.dataPedido);
      if (saleDate && saleDate > cat.ultimoPedido) {
        cat.ultimoPedido = saleDate;
      }

      cat.vendedores[sale.vendedor] = (cat.vendedores[sale.vendedor] || 0) + 1;
    });

    return map;
  }

  private static parseDate(dateString: string): Date {
    if (!dateString) return new Date(0);
    const [day, month, year] = dateString.split('/');
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateString);
  }

  private static getMostFrequent(counter: Record<string, number>): string {
    let max = 0;
    let label = '';
    Object.entries(counter).forEach(([key, count]) => {
      if (count > max) {
        max = count;
        label = key;
      }
    });
    return label || 'N/A';
  }

  private static truncateLabel(name: string, maxLength: number = 15): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }

  static exportToCSV(products: ParetoProduct[]): string {
    const headers = [
      'Produto',
      'Vendedor Principal',
      'Vendas Totais',
      '% Individual',
      '% Acumulado',
      'Classificação',
      'Último Pedido',
      'Total Pedidos',
      'Total Itens',
    ];
  
    const csvRows = [headers.join(',')];
    products.forEach(p => {
      const row = [
        `"${p.categoria}"`,
        `"${p.vendedorPrincipal}"`,
        p.vendasTotais.toFixed(2),
        p.percentualIndividual.toFixed(2),
        p.percentualAcumulado.toFixed(2),
        p.classificacao === 'TOP_20' ? 'TOP 20%' : 'Demais 80%',
        p.ultimoPedido,
        p.totalPedidos.toString(),
        p.totalItens.toString(),
      ];
      csvRows.push(row.join(','));
    });
    return csvRows.join('\n');
  }

  static downloadCSV(products: ParetoProduct[], filename: string = 'analise-pareto-produtos.csv'): void {
    const csvContent = this.exportToCSV(products);
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