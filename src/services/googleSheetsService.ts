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

export interface LeadData {
  dataCriacao: string;
  nome: string;
  produto: string;
  empresa: string;
  telefone: string;
  endereco: string;
  cidade: string;
  uf: string;
  vendedor: string;
  equipe: string;
  etapaFunil: string;
  trafego: string;
  fonte: string;
  campanha: string;
  valorCampanha: number;
  valorUsado: number;
  qualificacao: number;
  valor_unico: number;
  valor_recorrente: number;
  anotacoes: string;
  motivoPerda: string;
  estadoNegociacao: string;
  ticketMedio: number;
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

  async fetchLeadsData(range: string = 'LEADS!A:Z'): Promise<LeadData[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
      const response = await fetch(url);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao conectar com Google Sheets');
      }

      if (!data.values || data.values.length === 0) {
        return [];
      }

      const rows = data.values.slice(1);

      return rows.map((row): LeadData => ({
        // CSV columns:
        // A: Nome, B: Categoria (usada como produto), C: Estado (UF), D: Cidade, E: Endereço,
        // F: Trafego, G: Empresa, H: Qualificação, I: Funil de vendas, J: Etapa,
        // K: Estado (status textual), L: Motivo de Perda, M: Valor Único, N: Valor Recorrente,
        // O: Pausada (Ticket Médio do Produto), P: Data de criação, Q: Fonte, R: Campanha, S: valor da campanha,
        // T: valor usado, U: Responsável, V: Produtos, W: Equipes do responsável,
        // X: Anotação do motivo de perda, Y: Contatos, Z: Telefone
        nome: row[0] || '',
        produto: row[1] || '',
        uf: row[2] || '',
        cidade: row[3] || '',
        endereco: row[4] || '',
        trafego: row[5] || '',
        empresa: row[6] || '',
        qualificacao: parseInt(row[7]) || 0,
        etapaFunil: row[9] || '',
        estadoNegociacao: row[10] || '',
        motivoPerda: row[11] || '',
        valor_unico: parseInt(row[12]) || 0,
        valor_recorrente: parseInt(row[13]) || 0,
        ticketMedio: this.parseValue(row[14] || '0'),
        dataCriacao: row[15] || '',
        fonte: row[16] || '',
        campanha: row[17] || '',
        valorCampanha: this.parseValue(row[18] || '0'),
        valorUsado: this.parseValue(row[19] || '0'),
        vendedor: row[20] || '',
        equipe: row[22] || '',
        anotacoes: row[23] || '',
        telefone: row[25] || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar dados de leads:', error);
      throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar dados de leads');
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
    cliente?: string | string[];
    cidade?: string | string[];
    estado?: string | string[];
    categoria?: string | string[];
    vendedor?: string | string[];
    regional?: string | string[];
    tipoCliente?: string | string[];
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

      // Text filters (suporte a múltiplas opções)
      const match = (filterVal: string | string[] | undefined, candidate: string) => {
        if (!filterVal) return true
        if (Array.isArray(filterVal)) return filterVal.length === 0 ? true : filterVal.includes(candidate)
        return candidate === filterVal
      }

      if (!match(filters.cliente, item.nomeFantasia)) return false;
      if (!match(filters.cidade, item.cidade)) return false;
      if (!match(filters.estado, item.uf)) return false;
      if (!match(filters.categoria, item.categoria)) return false;
      if (!match(filters.vendedor, item.vendedor)) return false;
      if (!match(filters.regional, item.regional)) return false;
      if (!match(filters.tipoCliente, item.tipoCliente)) return false;

      return true;
    });
  }
}

export type { SalesData };