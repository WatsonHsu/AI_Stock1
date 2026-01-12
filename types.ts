
export interface DividendHistory {
  year: string;
  stockPriceAtDividend: number | string;
  dividendAmount: number | string;
  eps: number | string;
  payoutRatio: string;
}

export interface StockAnalysis {
  stockCode: string;
  companyName: string;
  exchange: 'TWSE' | 'TPEX'; // Added to distinguish between listed and OTC stocks
  industry: string;
  overview: string;
  futureProspects: string;
  trendPrediction: {
    direction: 'UP' | 'DOWN' | 'STABLE';
    probability: string;
    targetTimeframe: string;
    reasons: string[];
  };
  dividendHistory: DividendHistory[];
  sourceUrls: { title: string; uri: string }[];
}

export enum LoadingStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
