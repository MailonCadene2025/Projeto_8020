import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Percent, Package, Layers } from 'lucide-react';

interface ParetoProductsMetricsProps {
  totalSales: number;
  topCategoriesCount: number;
  topCategoriesPercentage: number;
  totalCategories: number;
  totalProducts: number;
}

export function ParetoProductsMetrics({ 
  totalSales, 
  topCategoriesCount, 
  topCategoriesPercentage, 
  totalCategories,
  totalProducts 
}: ParetoProductsMetricsProps) {
  const metrics = [
    {
      title: "Vendas Totais",
      value: totalSales,
      format: (value: number) => new Intl.NumberFormat('pt-BR').format(value),
      currency: true,
      icon: <TrendingUp className="h-3 w-3 text-primary" />
    },
    {
      title: "Total de Itens Vendidos",
      value: totalProducts,
      format: (value: number) => new Intl.NumberFormat('pt-BR').format(value),
      currency: false,
      icon: <Package className="h-3 w-3 text-primary" />
    },
    {
      title: "Produtos TOP 20%",
      value: topCategoriesCount,
      format: (value: number) => value.toString(),
      currency: false,
      icon: <Layers className="h-3 w-3 text-primary" />
    },
    {
      title: "% Vendas TOP 20%",
      value: topCategoriesPercentage,
      format: (value: number) => `${value.toFixed(1)}%`,
      currency: false,
      icon: <Percent className="h-3 w-3 text-primary" />
    },
    {
      title: "Total de Produtos",
      value: totalCategories,
      format: (value: number) => value.toString(),
      currency: false,
      icon: <Layers className="h-3 w-3 text-primary" />
    }
  ];

  return (
    <div className="grid gap-3 grid-cols-5">
      {metrics.map((metric, index) => (
        <Card key={index} className="shadow-card hover:shadow-elevation transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <div className="p-1 rounded-lg bg-muted">
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              <div className="text-xl font-bold">
                {metric.format(metric.value)}
              </div>
              {metric.currency && (
                <p className="text-xs text-muted-foreground">
                  R$
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};