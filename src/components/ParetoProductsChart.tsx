import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartData {
  categoria: string;
  vendas: number;
  percentualAcumulado: number;
  percentualIndividual: number;
}

interface ParetoProductsChartProps {
  data: ChartData[];
}

export const ParetoProductsChart: React.FC<ParetoProductsChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const salesValue = payload[0]?.value ?? 0;
      const isUpgrade = typeof label === 'string' && label.toLowerCase().includes('upgrade');
      return (
        <div className="bg-popover p-3 border rounded-lg shadow-elevation">
          <p className="font-medium mb-2">{`Produto: ${label}`}</p>
          <p className="text-sm text-success">
            {`Vendas: ${formatCurrency(payload[0]?.value || 0)}`}
          </p>
          <p className="text-sm text-warning">
            {`% Individual: ${formatPercentage(payload[0]?.payload?.percentualIndividual || 0)}`}
          </p>
          <p className="text-sm text-primary">
            {`% Acumulado: ${formatPercentage(payload[1]?.value || 0)}`}
          </p>
          {isUpgrade && salesValue < 0 && (
            <p className="text-xs text-muted-foreground italic mt-2">Referente a telas pegas na troca</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.percentualAcumulado >= 80) {
      return <circle cx={cx} cy={cy} r={4} fill="hsl(var(--warning))" stroke="hsl(var(--background))" strokeWidth={2} />;
    }
    return <circle cx={cx} cy={cy} r={2} fill="hsl(var(--primary))" />;
  };

  const chartData = data.slice(0, 20);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Gráfico de Pareto - TOP 20 Produtos
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="categoria" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                yAxisId="left"
                dataKey="vendas" 
                fill="hsl(var(--success))"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentualAcumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={<CustomizedDot />}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
              
              {/* Linha de referência 80% */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={() => 80}
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-success rounded"></div>
              <span>Vendas por Produto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-primary rounded"></div>
              <span>% Acumulado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-warning rounded border-dashed border-2 border-warning"></div>
              <span>Linha 80% (Princípio de Pareto)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};