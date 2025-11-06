import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search, Trophy, AlertTriangle } from 'lucide-react';
import { ExportMenu } from '@/components/ExportMenu';
import type { ExportColumn } from '@/utils/export';

export interface ParetoProduct {
  categoria: string;
  vendedorPrincipal: string;
  vendasTotais: number;
  percentualIndividual: number;
  percentualAcumulado: number;
  classificacao: 'TOP_20' | 'DEMAIS_80';
  ultimoPedido: string;
  totalPedidos: number;
  totalItens: number;
}

interface ParetoProductsTableProps {
  data: ParetoProduct[];
}

export const ParetoProductsTable: React.FC<ParetoProductsTableProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;

  const filteredData = data.filter(item =>
    item.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vendedorPrincipal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getClassificationBadge = (classificacao: string) => {
    if (classificacao === 'TOP_20') {
      return (
        <Badge className="bg-success-muted text-success border-success/20">
          <Trophy className="h-3 w-3 mr-1" />
          TOP 20%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-warning/20 text-warning">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Demais 80%
      </Badge>
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            80/20 - Produtos
            <Badge variant="outline" className="ml-2">
              {filteredData.length} resultados
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou vendedor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            {/* Export */}
            <ExportMenu
              data={filteredData}
              fileBaseName="pareto-produtos"
              columns={[
                { label: 'Produto', value: (p) => p.categoria },
                { label: 'Vendedor Principal', value: (p) => p.vendedorPrincipal },
                { label: 'Vendas Totais', value: (p) => p.vendasTotais.toFixed(2) },
                { label: '% Individual', value: (p) => p.percentualIndividual.toFixed(2) },
                { label: '% Acumulado', value: (p) => p.percentualAcumulado.toFixed(2) },
                { label: 'Classificação', value: (p) => (p.classificacao === 'TOP_20' ? 'TOP 20%' : 'Demais 80%') },
                { label: 'Último Pedido', value: (p) => p.ultimoPedido },
                { label: 'Total Pedidos', value: (p) => p.totalPedidos },
                { label: 'Total Itens', value: (p) => p.totalItens },
              ] as ExportColumn<ParetoProduct>[]}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Produto</TableHead>
                <TableHead className="font-semibold">Vendedor</TableHead>
                <TableHead className="font-semibold text-right">Vendas Totais</TableHead>
                <TableHead className="font-semibold text-right">% Individual</TableHead>
                <TableHead className="font-semibold text-right">% Acumulado</TableHead>
                <TableHead className="font-semibold text-center">Classificação</TableHead>
                <TableHead className="font-semibold text-center">Último Pedido</TableHead>
                <TableHead className="font-semibold text-center">Total Pedidos</TableHead>
                <TableHead className="font-semibold text-center">Total Itens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{item.categoria}</TableCell>
                  <TableCell>{item.vendedorPrincipal}</TableCell>
                  <TableCell 
                    className="text-right font-medium"
                    title={item.vendasTotais < 0 && item.categoria.toLowerCase().includes('upgrade') ? 'Referente a telas pegas na troca' : undefined}
                  >
                    {formatCurrency(item.vendasTotais)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.percentualIndividual.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {item.percentualAcumulado.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {getClassificationBadge(item.classificacao)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {formatDate(item.ultimoPedido)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {item.totalPedidos}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {item.totalItens}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length} resultados
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};