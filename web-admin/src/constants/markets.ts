export const MARKETS = [
  'Pasar Bauntung',
  'Pasar Jati',
  'Pasar Ulin Raya',
  'Pasar Pagi Loktabat Utara',
] as const;

export type MarketName = typeof MARKETS[number];

export const MARKET_ID_MAP: Record<MarketName, string> = {
  'Pasar Bauntung': 'bauntung',
  'Pasar Jati': 'jati',
  'Pasar Ulin Raya': 'ulin_raya',
  'Pasar Pagi Loktabat Utara': 'loktabat_utara',
};
