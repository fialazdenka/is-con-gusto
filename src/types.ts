export type ProvozovnaId = 'all' | string;
export type DataMode = 'live' | 'zavierka';
export type Period = 'dnes' | 'vcera' | 'tyden' | 'minuly-tyden' | 'minuly-mesic' | 'rok';
export type SidebarSection =
  | 'dashboard'
  | 'trzby'
  | 'zavierky'
  | 'provozovny'
  | 'cashflow'
  | 'faktury'
  // Phase 8.10 (zápis 22. 6. 2026) — Faktury rozděleny na 2 samostatné podsekce v sidebar.
  // Obě používají FakturyView se zafixovaným tabem (defaultTyp = 'prijata'/'vydana').
  | 'faktury-prijate'
  | 'faktury-vydane'
  | 'pohledavky'
  | 'platby'
  | 'banka'
  // Ekonomika — Daně (Phase 7 — zápis 12. 6. 2026)
  | 'dane'
  // Finance — nové podsekce (Phase 1 restrukturalizace)
  | 'trvale-prikazy'
  | 'uvery'
  | 'poplatky'
  | 'karty'
  | 'qerko'
  | 'gopay'
  | 'sodexo'
  | 'reporty'
  | 'nastaveni'
  | 'komponenty'
  | 'kod';

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
  status: 'active' | 'planned' | 'inactive';
  parentId?: string;   // pro sub-sekce provozovny (Piazza ristorante/caffe/garden)
  note?: string;       // interní poznámka (IT, budoucí brand, atp.)
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
  // Phase 8.3 (zápis 19. 6. 2026) — cross-section nav: jiné view (Banka, Platby, ...) může požádat
  // o otevření konkrétní faktury v sekci Faktury. FakturyView toto pole čte v useEffect a vyčistí.
  pendingFakturaId?: string | null;
  // Phase 8.5 (zápis 12. 6. 2026) — Banka → Trvalé příkazy: vytvořit TP z nespárované transakce
  // (předvyplní firmu, částku, protiÚčet, VS). TrvalePrikazyView otevře form modal s těmito daty.
  pendingTPFromTrans?: { firma: string; castka: number; protiUcet?: string; vs?: string } | null;
  // Phase 8.5 (zápis 12. 6. 2026) — Banka → Poplatky: zaevidovat nespárovanou transakci jako bankovní poplatek
  pendingPoplatekFromTrans?: { popis: string; castka: number; datum: string; provozovna: string } | null;
}
