interface SalesData {
  dataPedido: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  categoria: string;
  vendedor: string;
  regional: string;
  tipoCliente: string;
  quantidade: number;
  valor: number;
}

export interface HistoryData {
  dataPedido: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  categoria: string;
  formaPagamento: string;
  nf: string;
  vendedor: string;
  regional: string;
  quantidade: number;
  valor: number;
}

export interface DemoComodatosData {
  dataPedido: string;
  nomeFantasia: string;
  categoria: string;
  vendedor: string;
  cidade: string;
  uf: string;
  regional: string;
  quantidade: number;
  valor: number;
}

interface ApiResponse {
  values?: string[][];
  error?: {
    message: string;
    code: number;
  };
}

export class GoogleSheetsService {
  private apiKey: string;
  private sheetId: string;

  constructor(apiKey: string, sheetId: string) {
    this.apiKey = apiKey;
    this.sheetId = sheetId;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    // Handle DD/MM/YYYY format
    const [day, month, year] = dateString.split('/');
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback to standard parsing
    return new Date(dateString);
  }

  private parseValue(valueString: string): number {
    if (!valueString) return 0;
    
    // Remove currency symbols and format
    return parseFloat(
      valueString
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  async fetchData(range: string = 'VENDAS!A:J'): Promise<SalesData[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao conectar com Google Sheets');
      }

      if (!data.values || data.values.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      // Skip header row
      const rows = data.values.slice(1);
      
      return rows.map((row): SalesData => ({
        dataPedido: row[0] || '',
        nomeFantasia: row[1] || '',
        cidade: row[2] || '',
        uf: row[3] || '',
        categoria: row[4] || '',
        vendedor: row[5] || '',
        regional: row[6] || '',
        tipoCliente: row[7] || '',
        quantidade: parseInt(row[8]) || 0, // Coluna I
        valor: this.parseValue(row[9] || '0') // Coluna J
      }));
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar dados');
    }
  }

  async fetchHistoryData(range: string = 'HVENDAS!A:K'): Promise<HistoryData[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao conectar com Google Sheets');
      }

      if (!data.values || data.values.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      // Skip header row
      const rows = data.values.slice(1);
      
      return rows.map((row): HistoryData => ({
        dataPedido: row[0] || '',
        nomeFantasia: row[1] || '',
        cidade: row[2] || '',
        uf: row[3] || '',
        categoria: row[4] || '',
        formaPagamento: row[5] || '',
        nf: row[6] || '',
        vendedor: row[7] || '',
        regional: row[8] || '',
        quantidade: parseInt(row[9]) || 0,
        valor: this.parseValue(row[10] || '0')
      }));
    } catch (error) {
      console.error('Erro ao buscar dados de histórico:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar dados de histórico');
    }
  }

  async fetchDemoComodatosData(range: string = 'DEMONS_COMODATOS!A:I'): Promise<DemoComodatosData[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao conectar com Google Sheets');
      }

      if (!data.values || data.values.length === 0) {
        throw new Error('Nenhum dado encontrado na planilha');
      }

      const rows = data.values.slice(1);

      return rows.map((row): DemoComodatosData => ({
        dataPedido: row[0] || '',
        nomeFantasia: row[1] || '',
        categoria: row[2] || '',
        vendedor: row[3] || '',
        cidade: row[4] || '',
        uf: row[5] || '',
        regional: row[6] || '',
        quantidade: parseInt(row[7]) || 0,
        valor: this.parseValue(row[8] || '0')
      }));
    } catch (error) {
      console.error('Erro ao buscar dados de demonstrações/comodatos:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar dados de demonstrações/comodatos');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchData('VENDAS!A1:J1');
      return true;
    } catch (error) {
      return false;
    }
  }

  static extractUniqueValues(data: SalesData[], field: keyof SalesData): string[] {
    const uniqueValues = [...new Set(data.map(item => String(item[field])).filter(Boolean))];
    return uniqueValues.sort();
  }

  static filterData(data: SalesData[], filters: {
    dataInicio?: string;
    dataFim?: string;
    cliente?: string;
    cidade?: string;
    estado?: string;
    categoria?: string;
    vendedor?: string;
    regional?: string;
    tipoCliente?: string;
  }): SalesData[] {
    return data.filter(item => {
      // Date filters
      if (filters.dataInicio || filters.dataFim) {
        const itemDate = new Date(item.dataPedido.split('/').reverse().join('-'));
        
        if (filters.dataInicio) {
          const startDate = new Date(filters.dataInicio);
          if (itemDate < startDate) return false;
        }
        
        if (filters.dataFim) {
          const endDate = new Date(filters.dataFim);
          if (itemDate > endDate) return false;
        }
      }

      // Text filters
      if (filters.cliente && item.nomeFantasia !== filters.cliente) return false;
      if (filters.cidade && item.cidade !== filters.cidade) return false;
      if (filters.estado && item.uf !== filters.estado) return false;
      if (filters.categoria && item.categoria !== filters.categoria) return false;
      if (filters.vendedor && item.vendedor !== filters.vendedor) return false;
      if (filters.regional && item.regional !== filters.regional) return false;
      if (filters.tipoCliente && item.tipoCliente !== filters.tipoCliente) return false;

      return true;
    });
  }
}

export type { SalesData };