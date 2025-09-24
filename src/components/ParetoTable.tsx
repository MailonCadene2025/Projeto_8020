import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Search, Trophy, AlertTriangle, Download } from 'lucide-react';

export interface ParetoClient {
  nomeFantasia: string;
  cidade: string;
  uf: string;
  vendedorPrincipal: string;
  categoriaPrincipal: string;
  vendasTotais: number;
  percentualIndividual: number;
  percentualAcumulado: number;
  classificacao: 'TOP_20' | 'DEMAIS_80';
  ultimoPedido: string;
  totalPedidos: number;
  totalItens: number;
}

interface ParetoTableProps {
  data: ParetoClient[];
  onExport: () => void;
}

export const ParetoTable: React.FC<ParetoTableProps> = ({ data, onExport }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;

  const filteredData = data.filter(client =>
    client.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.vendedorPrincipal.toLowerCase().includes(searchTerm.toLowerCase())
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
            Análise Pareto - Clientes
            <Badge variant="outline" className="ml-2">
              {filteredData.length} resultados
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, cidade ou vendedor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Localização</TableHead>
                <TableHead className="font-semibold">Vendedor</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
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
              {paginatedData.map((client, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {client.nomeFantasia}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{client.cidade}</div>
                      <div className="text-muted-foreground">{client.uf}</div>
                    </div>
                  </TableCell>
                  <TableCell>{client.vendedorPrincipal}</TableCell>
                  <TableCell>{client.categoriaPrincipal}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(client.vendasTotais)}
                  </TableCell>
                  <TableCell className="text-right">
                    {client.percentualIndividual.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {client.percentualAcumulado.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {getClassificationBadge(client.classificacao)}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {formatDate(client.ultimoPedido)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {client.totalPedidos}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {client.totalItens}
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