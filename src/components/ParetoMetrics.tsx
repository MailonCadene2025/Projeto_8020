import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Percent, Package } from 'lucide-react';

interface ParetoMetricsProps {
  totalSales: number;
  topClientsCount: number;
  topClientsPercentage: number;
  totalClients: number;
  totalProducts: number;
}

export function ParetoMetrics({ 
  totalSales, 
  topClientsCount, 
  topClientsPercentage, 
  totalClients,
  totalProducts 
}: ParetoMetricsProps) {
  const metrics = [
    {
      title: "Vendas Totais",
      value: totalSales,
      format: (value: number) => new Intl.NumberFormat('pt-BR').format(value),
      currency: true
    },
    {
      title: "Total de Produtos Vendidos",
      value: totalProducts,
      format: (value: number) => new Intl.NumberFormat('pt-BR').format(value),
      currency: false
    },
    {
      title: "Clientes TOP 20%",
      value: topClientsCount,
      format: (value: number) => value.toString(),
      currency: false
    },
    {
      title: "% Vendas TOP 20%",
      value: topClientsPercentage,
      format: (value: number) => `${value.toFixed(1)}%`,
      currency: false
    },
    {
      title: "Total de Clientes",
      value: totalClients,
      format: (value: number) => value.toString(),
      currency: false
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
              {index === 0 ? <TrendingUp className="h-3 w-3 text-primary" /> :
               index === 1 ? <Package className="h-3 w-3 text-primary" /> :
               index === 2 ? <Users className="h-3 w-3 text-primary" /> :
               index === 3 ? <Percent className="h-3 w-3 text-primary" /> :
               <Users className="h-3 w-3 text-primary" />}
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