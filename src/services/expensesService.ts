
export interface GeneralExpenseData {
  data: string;
  vendedor: string;
  municipio: string;
  categoria: string;
  nfUrl: string;
  regional: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface FuelExpenseData {
  data: string;
  vendedor: string;
  municipio: string;
  hodometro: number;
  tipoCombustivel: string;
  nfUrl: string;
  regional: string;
  quantidadeLitros: number;
  valorUnitario: number;
  valorTotal: number;
}

export class ExpensesService {
  private parseValue(valueString: string): number {
    if (!valueString) return 0;
    
    // Remove "R$", whitespace, replace dots with nothing, then replace comma with dot
    return parseFloat(
      valueString
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  private parseNumber(valueString: string): number {
    if (!valueString) return 0;
    // Handle numbers that might be formatted like "1.234,56" or "1234,56"
    // Remove dots (thousands separators) and replace comma with dot (decimal)
    return parseFloat(
      valueString
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  private parseCSVLine(row: string): string[] {
    // Regex to split by comma ONLY if it's not inside quotes
    // Matches a comma that is followed by an even number of double quotes
    return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
  }

  async fetchGeneralExpenses(): Promise<GeneralExpenseData[]> {
    try {
      const response = await fetch('/DADOS - DESP_GERAL.csv');
      const csv = await response.text();
      const rows = csv.split('\n').slice(1); // Skip header
      
      return rows
        .filter(row => row.trim() !== '')
        .map(row => {
          const columns = this.parseCSVLine(row);

          // Columns mapping:
          // 0: Data
          // 1: vendedor
          // 2: Município
          // 3: Tipo do custo
          // 4: Setor
          // 5: Categoria
          // 6: Foto da NF ou Recibo
          // 7: Quantidade
          // 8: Valor Unit
          // 9: Valor Total
          // 10: Regional (Column K)
          
          // Ensure we have enough columns to avoid undefined errors
          if (columns.length < 11) return null;

          const data = columns[0];
          const vendedor = columns[1];
          const municipio = columns[2];
          // const tipoCusto = columns[3];
          // const setor = columns[4];
          const categoria = columns[5];
          const nfUrl = columns[6];
          const quantidade = columns[7];
          const valorUnit = columns[8];
          const valorTotal = columns[9];
          const regional = columns[10];
          
          return {
            data,
            vendedor,
            municipio,
            categoria,
            nfUrl,
            regional,
            quantidade: this.parseNumber(quantidade),
            valorUnitario: this.parseValue(valorUnit),
            valorTotal: this.parseValue(valorTotal),
          };
        })
        .filter((item): item is GeneralExpenseData => item !== null);
    } catch (error) {
      console.error('Error fetching general expenses:', error);
      return [];
    }
  }

  async fetchFuelExpenses(): Promise<FuelExpenseData[]> {
    try {
      const response = await fetch('/DADOS - DESP_COMBUSTIVEL.csv');
      const csv = await response.text();
      const rows = csv.split('\n').slice(1); // Skip header
      
      return rows
        .filter(row => row.trim() !== '')
        .map(row => {
          const columns = this.parseCSVLine(row);
          
          // Columns mapping:
          // 0: Data
          // 1: Nome Completo
          // 2: Município
          // 3: Hodômetro Atual
          // 4: Combustível
          // 5: Foto da NF ou Recibo
          // 6: Litros
          // 7: Valor Unit
          // 8: Valor Total
          // 9: Regional (Column J)
          // 10: Categoria

          if (columns.length < 10) return null;
          
          const data = columns[0];
          const vendedor = columns[1];
          const municipio = columns[2];
          const hodometro = columns[3];
          const tipoCombustivel = columns[4];
          const nfUrl = columns[5];
          const litros = columns[6];
          const valorUnit = columns[7];
          const valorTotal = columns[8];
          const regional = columns[9];
          // const categoria = columns[10];
          
          return {
            data,
            vendedor,
            municipio,
            hodometro: this.parseNumber(hodometro),
            tipoCombustivel,
            nfUrl,
            regional,
            quantidadeLitros: this.parseNumber(litros),
            valorUnitario: this.parseValue(valorUnit),
            valorTotal: this.parseValue(valorTotal),
          };
        })
        .filter((item): item is FuelExpenseData => item !== null);
    } catch (error) {
      console.error('Error fetching fuel expenses:', error);
      return [];
    }
  }
}

export const expensesService = new ExpensesService();
