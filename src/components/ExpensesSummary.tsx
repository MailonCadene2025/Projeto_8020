
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneralExpenseData } from "@/services/expensesService";
import { DollarSign, Utensils, Bed, Car } from "lucide-react";

interface ExpensesSummaryProps {
  expenses: GeneralExpenseData[];
}

export function ExpensesSummary({ expenses }: ExpensesSummaryProps) {
  // Cálculos
  const totalGeral = expenses.reduce((acc, curr) => acc + curr.valorTotal, 0);

  const alimentacaoExpenses = expenses.filter(
    (e) => e.categoria === "Alimentação"
  );
  const totalAlimentacao = alimentacaoExpenses.reduce(
    (acc, curr) => acc + curr.valorTotal,
    0
  );
  const mediaAlimentacao =
    alimentacaoExpenses.length > 0
      ? totalAlimentacao / alimentacaoExpenses.length
      : 0;

  const hotelExpenses = expenses.filter((e) => e.categoria === "Hotel");
  const totalHotel = hotelExpenses.reduce(
    (acc, curr) => acc + curr.valorTotal,
    0
  );
  const mediaHotel =
    hotelExpenses.length > 0 ? totalHotel / hotelExpenses.length : 0;

  const lavagemCount = expenses.filter(
    (e) => e.categoria === "Lava Car"
  ).length;

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card className="border-t-4 border-emerald-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Total Geral de Custo
          </CardTitle>
          <div className="p-2 bg-emerald-100 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalGeral)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Soma de todas as despesas
          </p>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-amber-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Média de Alimentação
          </CardTitle>
          <div className="p-2 bg-amber-100 rounded-lg">
            <Utensils className="h-4 w-4 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(mediaAlimentacao)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Valor médio por refeição
          </p>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-purple-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Média de Hotel</CardTitle>
          <div className="p-2 bg-purple-100 rounded-lg">
            <Bed className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(mediaHotel)}</div>
          <p className="text-xs text-slate-500 mt-1">
            Valor médio por diária
          </p>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-blue-500 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Total Lavagem de Carro
          </CardTitle>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Car className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">{lavagemCount}</div>
          <p className="text-xs text-slate-500 mt-1">
            Lavagens realizadas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
