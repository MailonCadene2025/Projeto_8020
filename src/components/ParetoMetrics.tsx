import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Percent, Target } from 'lucide-react';

interface ParetoMetricsProps {
  totalSales: number;
  topClientsCount: number;
  topClientsPercentage: number;
  totalClients: number;
}

export const ParetoMetrics: React.FC<ParetoMetricsProps> = ({
  totalSales,
  topClientsCount,
  topClientsPercentage,
  totalClients
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const metrics = [
    {
      title: 'Vendas Totais',
      value: formatCurrency(totalSales),
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-muted',
      description: 'Total do período filtrado'
    },
    {
      title: 'Clientes TOP 20%',
      value: topClientsCount.toString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary-muted',
      description: 'Clientes que geram 80% da receita'
    },
    {
      title: '% Receita TOP 20%',
      value: formatPercentage(topClientsPercentage),
      icon: Percent,
      color: 'text-warning',
      bgColor: 'bg-warning-muted',
      description: 'Concentração da receita'
    },
    {
      title: 'Total de Clientes',
      value: totalClients.toString(),
      icon: Target,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      description: 'Clientes únicos no período'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="shadow-card hover:shadow-elevation transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};