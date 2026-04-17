export type ProvozovnaId = 'all' | 'cg-brno' | 'piazza' | 'monte';
export type DataMode = 'live' | 'zavierka';
export type Period = '7d' | '30d' | 'mtd';
export type SidebarSection =
  | 'dashboard'
  | 'trzby'
  | 'zavierky'
  | 'provozovny'
  | 'cashflow'
  | 'faktury'
  | 'platby'
  | 'reporty'
  | 'nastaveni'
  | 'komponenty';

export type ZavierkaStav = 'ok' | 'chyba' | 'ceka';
export type CashflowStav = 'ok' | 'po-splatnosti' | 'ceka';
export type FakturaStav = 'uhrazena' | 'ceka' | 'po-splatnosti';

export interface Provozovna {
  id: string;
  name: string;
  shortName: string;
  color: string;
  address: string;
  manager: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface DenniTrzba {
  datum: string;
  provozovna: string;
  kuchyn: number;
  bar: number;
  celkem: number;
  mode: DataMode;
}

export interface DenniZavierka {
  id: string;
  datum: string;
  provozovna: string;
  trzba: number;
  stav: ZavierkaStav;
  zalozil: string;
  cas: string;
  poznamka?: string;
}

export interface CashflowItem {
  id: string;
  typ: 'prijem' | 'vydaj';
  popis: string;
  castka: number;
  datum: string;
  splatnost?: string;
  stav: CashflowStav;
}

export interface Faktura {
  id: string;
  cislo: string;
  dodavatel: string;
  castka: number;
  datum: string;
  splatnost: string;
  stav: FakturaStav;
}

export interface AppState {
  selectedSection: SidebarSection;
  selectedProvozovna: ProvozovnaId;
  dataMode: DataMode;
  period: Period;
  drawerOpen: boolean;
  drawerProvozovnaId: string | null;
  sidebarCollapsed: boolean;
}
