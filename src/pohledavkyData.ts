// ─────────────────────────────────────────────────────────────
// Mock data – modul Pohledávky (vydané faktury, sledování úhrad)
// Referenční datum: 2026-04-17 (čtvrtek)
// ─────────────────────────────────────────────────────────────

export type PohledavkaStav =
  | 'vystavena'    // vystavena, dosud neodeslána klientovi
  | 'odeslana'     // odeslána klientovi, čeká na úhradu
  | 'po-splatnosti'// splatnost uplynula, bez upomínky
  | 'upominka-1'   // 1. upomínka odeslána
  | 'upominka-2'   // 2. upomínka odeslána
  | 'predžalobni'  // předžalobní výzva
  | 'uhrazena';    // uhrazena

export interface Pohledavka {
  id: string;
  cislo: string;
  klient: string;
  kontaktEmail?: string;
  provozovna: string;
  castka: number;
  datum: string;        // datum vystavení
  splatnost: string;    // účetní splatnost
  stav: PohledavkaStav;
  poznamka?: string;
  odeslano?: string;    // datum odeslání klientovi
  uhrazeno?: string;    // datum úhrady
  opakovani?: 'mesicni' | 'tydenni';
}

// ─── Referenční datum ─────────────────────────────────────────
export const REF_DATE = '2026-04-17';

// ─── Mock pohledávky ──────────────────────────────────────────
export const POHLEDAVKY: Pohledavka[] = [
  // ── UHRAZENÉ ──
  {
    id: 'ph01',
    cislo: 'VYD-2026-0012',
    klient: 'AutoPalace a.s.',
    kontaktEmail: 'fakturace@autopalace.cz',
    provozovna: 'monte',
    castka: 28_500,
    datum: '2026-03-10',
    splatnost: '2026-03-25',
    stav: 'uhrazena',
    poznamka: 'Firemní catering – leden/únor',
    odeslano: '2026-03-10',
    uhrazeno: '2026-03-22',
    opakovani: 'mesicni',
  },
  {
    id: 'ph02',
    cislo: 'VYD-2026-0015',
    klient: 'Brno Hotel a.s.',
    kontaktEmail: 'ekonom@brnohotel.cz',
    provozovna: 'piazza',
    castka: 45_200,
    datum: '2026-04-01',
    splatnost: '2026-04-15',
    stav: 'uhrazena',
    poznamka: 'Konference 28.3. – raut pro 60 osob',
    odeslano: '2026-04-01',
    uhrazeno: '2026-04-12',
  },
  {
    id: 'ph03',
    cislo: 'VYD-2026-0010',
    klient: 'Tech Solutions s.r.o.',
    kontaktEmail: 'ucetni@techsolutions.cz',
    provozovna: 'cg-brno',
    castka: 12_400,
    datum: '2026-03-01',
    splatnost: '2026-03-15',
    stav: 'uhrazena',
    odeslano: '2026-03-01',
    uhrazeno: '2026-03-14',
    opakovani: 'mesicni',
  },

  // ── ODESLANÉ – aktuální splatnost ──
  {
    id: 'ph04',
    cislo: 'VYD-2026-0019',
    klient: 'Moravské centrum s.r.o.',
    kontaktEmail: 'info@moravskecentrum.cz',
    provozovna: 'piazza',
    castka: 67_800,
    datum: '2026-04-08',
    splatnost: '2026-04-22',
    stav: 'odeslana',
    poznamka: 'Gala večeře 5.4. – 80 hostů',
    odeslano: '2026-04-08',
  },
  {
    id: 'ph05',
    cislo: 'VYD-2026-0020',
    klient: 'ČSOB a.s.',
    kontaktEmail: 'dodavatele@csob.cz',
    provozovna: 'cg-brno',
    castka: 31_500,
    datum: '2026-04-10',
    splatnost: '2026-04-30',
    stav: 'odeslana',
    poznamka: 'Team building 8.4.',
    odeslano: '2026-04-10',
    opakovani: 'mesicni',
  },
  {
    id: 'ph06',
    cislo: 'VYD-2026-0021',
    klient: 'Continental Hotels CZ',
    kontaktEmail: 'finance@continentalhotels.cz',
    provozovna: 'piazza',
    castka: 55_000,
    datum: '2026-04-14',
    splatnost: '2026-04-28',
    stav: 'odeslana',
    poznamka: 'Recepce pro partnery – 50 osob',
    odeslano: '2026-04-14',
  },

  // ── VYSTAVENÉ – dosud neodeslané ──
  {
    id: 'ph07',
    cislo: 'VYD-2026-0022',
    klient: 'Jihomoravský kraj',
    kontaktEmail: 'podatelna@kr-jihomoravsky.cz',
    provozovna: 'monte',
    castka: 18_400,
    datum: '2026-04-16',
    splatnost: '2026-04-30',
    stav: 'vystavena',
    poznamka: 'Obědy pro delegaci 14.4.',
  },
  {
    id: 'ph08',
    cislo: 'VYD-2026-0023',
    klient: 'NovaTech a.s.',
    kontaktEmail: 'fakturace@novatech.cz',
    provozovna: 'cg-brno',
    castka: 8_900,
    datum: '2026-04-17',
    splatnost: '2026-05-01',
    stav: 'vystavena',
  },

  // ── PO SPLATNOSTI – bez upomínky ──
  {
    id: 'ph09',
    cislo: 'VYD-2026-0016',
    klient: 'Česká pojišťovna a.s.',
    kontaktEmail: 'dodavatele@cpoj.cz',
    provozovna: 'cg-brno',
    castka: 89_000,
    datum: '2026-03-27',
    splatnost: '2026-04-10',
    stav: 'po-splatnosti',
    poznamka: 'Firemní akce 25.3. – 120 hostů',
    odeslano: '2026-03-27',
  },
  {
    id: 'ph10',
    cislo: 'VYD-2026-0014',
    klient: 'Komfort a.s.',
    kontaktEmail: 'ekonomika@komfort.cz',
    provozovna: 'monte',
    castka: 11_200,
    datum: '2026-03-22',
    splatnost: '2026-04-05',
    stav: 'po-splatnosti',
    odeslano: '2026-03-22',
  },

  // ── UPOMÍNKY ──
  {
    id: 'ph11',
    cislo: 'VYD-2026-0011',
    klient: 'Veřejná správa Brno',
    kontaktEmail: 'sekretariat@vsprava-brno.cz',
    provozovna: 'piazza',
    castka: 15_600,
    datum: '2026-03-10',
    splatnost: '2026-03-28',
    stav: 'upominka-1',
    odeslano: '2026-03-10',
    poznamka: 'Pracovní obědy – únor/březen',
  },
  {
    id: 'ph12',
    cislo: 'VYD-2026-0008',
    klient: 'Agrofert Brno s.r.o.',
    kontaktEmail: 'fakturace@agrofert-brno.cz',
    provozovna: 'cg-brno',
    castka: 34_200,
    datum: '2026-02-18',
    splatnost: '2026-03-04',
    stav: 'predžalobni',
    poznamka: 'Výroční večeře 15.2.',
    odeslano: '2026-02-18',
  },
];

// ─── Helpery ──────────────────────────────────────────────────

export function getPohledavkyForProvozovna(provozovna: string): Pohledavka[] {
  if (provozovna === 'all') return POHLEDAVKY;
  return POHLEDAVKY.filter((p) => p.provozovna === provozovna);
}

export function getDniPoSplatnosti(splatnost: string): number {
  const ref = new Date(REF_DATE);
  const due = new Date(splatnost);
  return Math.max(0, Math.floor((ref.getTime() - due.getTime()) / 86_400_000));
}

export function isPoSplatnostiPoh(splatnost: string): boolean {
  return getDniPoSplatnosti(splatnost) > 0;
}

export function getCelkemAktivni(provozovna: string): number {
  return getPohledavkyForProvozovna(provozovna)
    .filter((p) => p.stav !== 'uhrazena')
    .reduce((s, p) => s + p.castka, 0);
}

export function getCelkemPoSplatnosti(provozovna: string): number {
  return getPohledavkyForProvozovna(provozovna)
    .filter((p) => ['po-splatnosti', 'upominka-1', 'upominka-2', 'predžalobni'].includes(p.stav))
    .reduce((s, p) => s + p.castka, 0);
}

export function getUhrazenoTentoMesic(provozovna: string): number {
  return getPohledavkyForProvozovna(provozovna)
    .filter((p) => p.stav === 'uhrazena' && p.uhrazeno?.startsWith('2026-04'))
    .reduce((s, p) => s + p.castka, 0);
}

// Aging buckets pro aging report
export interface AgingBucket {
  label: string;
  dniOd: number;
  dniDo: number;
  color: string;
  castka: number;
  pocet: number;
}

export function getAgingBuckets(provozovna: string): AgingBucket[] {
  const aktivni = getPohledavkyForProvozovna(provozovna).filter((p) => p.stav !== 'uhrazena');
  const buckets: AgingBucket[] = [
    { label: 'Aktuální',         dniOd: -999, dniDo: 0,  color: '#14b8a6', castka: 0, pocet: 0 },
    { label: '1–30 dní',         dniOd: 1,    dniDo: 30, color: '#f97316', castka: 0, pocet: 0 },
    { label: '31–60 dní',        dniOd: 31,   dniDo: 60, color: '#ef4444', castka: 0, pocet: 0 },
    { label: '61+ dní',          dniOd: 61,   dniDo: 999,color: '#991b1b', castka: 0, pocet: 0 },
  ];
  for (const p of aktivni) {
    const dni = getDniPoSplatnosti(p.splatnost);
    const b = buckets.find((b) => dni >= b.dniOd && dni <= b.dniDo)!;
    if (b) { b.castka += p.castka; b.pocet++; }
  }
  return buckets;
}

export const STAV_META_POH: Record<PohledavkaStav, { cls: string; label: string }> = {
  vystavena:      { cls: 'bg-secondary-subtle text-secondary', label: 'Vystavena' },
  odeslana:       { cls: 'bg-info-subtle text-info',           label: 'Odesláno' },
  'po-splatnosti':{ cls: 'bg-warning-subtle text-warning',     label: 'Po splatnosti' },
  'upominka-1':   { cls: 'bg-orange-subtle text-orange',       label: '1. upomínka' },
  'upominka-2':   { cls: 'bg-danger-subtle text-danger',       label: '2. upomínka' },
  predžalobni:    { cls: 'bg-danger text-white',               label: 'Předžalobní' },
  uhrazena:       { cls: 'bg-success-subtle text-success',     label: 'Uhrazena' },
};

// Pořadí stavů pro timeline
export const STAV_TIMELINE: PohledavkaStav[] = [
  'vystavena', 'odeslana', 'po-splatnosti', 'upominka-1', 'upominka-2', 'predžalobni', 'uhrazena',
];

export function getNextUpominka(stav: PohledavkaStav): PohledavkaStav | null {
  if (stav === 'vystavena')    return 'odeslana';
  if (stav === 'odeslana')     return 'po-splatnosti';
  if (stav === 'po-splatnosti')return 'upominka-1';
  if (stav === 'upominka-1')   return 'upominka-2';
  if (stav === 'upominka-2')   return 'predžalobni';
  return null;
}

export function getNextActionLabel(stav: PohledavkaStav): string | null {
  if (stav === 'vystavena')    return 'Odeslat klientovi';
  if (stav === 'odeslana')     return 'Odeslat 1. upomínku';
  if (stav === 'po-splatnosti')return 'Odeslat 1. upomínku';
  if (stav === 'upominka-1')   return 'Odeslat 2. upomínku';
  if (stav === 'upominka-2')   return 'Předžalobní výzva';
  return null;
}
