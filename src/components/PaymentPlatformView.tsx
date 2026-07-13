// COMPONENT: Generická view pro platební platformu (Qerko / GoPay / Sodexo)
// SOURCE: Larkon table/card pattern
// CUSTOM:
//  - rozdělení po provozovnách (per zápis 4. 6. 2026 — sladění s cashflow)
//  - „Příchozí platba je net (po provizi)" → skutečný poplatek se počítá zpětně z rozdílu

import { useState, useMemo, useEffect, Fragment } from 'react';
import {
  PLATFORMS,
  getDataForPlatforma,
  PAR_STAV_META,
  FAKT_STAV_META,
  type PlatformaId,
  type DenniParovani,
} from '../paymentPlatformsData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate, PROVOZOVNY } from '../data';
import KpiBox from './KpiBox';

interface Props {
  platforma: PlatformaId;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function getProvNazev(provId?: string): string {
  if (!provId) return 'Nepřiřazeno';
  return PROVOZOVNY.find((p) => p.id === provId)?.shortName ?? provId;
}
function getProvColor(provId?: string): string {
  if (!provId) return '#9097a7';
  return PROVOZOVNY.find((p) => p.id === provId)?.color ?? '#9097a7';
}
// Skutečný poplatek = tržba POS − příchozí
function skutecnyPoplatek(d: DenniParovani): number | null {
  if (d.prislo === null) return null;
  return d.trzbaPos - d.prislo;
}
// Odchylka odhadu od skutečnosti
function odchylkaOdhadu(d: DenniParovani): number | null {
  const skut = skutecnyPoplatek(d);
  if (skut === null) return null;
  return d.poplatekOdhad - skut;   // > 0 = odhad vyšší než skutečnost
}

// ──────────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────────
// Phase 7 (zápis 12. 6. 2026) — měsíční flow pro terminál:
//  - Denní kontrola nerealistická → měsíční kontrola výpisem od poskytovatele
//  - Tlačítko Import výpisu + Export pro účetního
//  - Notifikace, pokud výpis za aktuální měsíc chybí
// Phase 7 — info banner pro GoPay (139k Kč nesoulad v řešení)
function GoPayAlertBanner() {
  return (
    <div className="alert alert-warning py-2 mb-3 d-flex align-items-start gap-2 fs-13">
      <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 20, marginTop: 2, color: '#ad7a08' }} />
      <div className="flex-grow-1">
        <div className="fw-semibold">V řešení — nesoulad ~139 000 Kč na účtu GoPay</div>
        <div className="fs-12 mt-1">
          Probíhá analýza dat z API GoPay (nepravidelné připisování). Plné řešení je odloženo, dokud
          se neprozkoumají možnosti integrace přes API. Předběžné výsledky budou na další schůzce.
        </div>
      </div>
    </div>
  );
}

interface DailyComparison {
  datum: string;
  vypisSuma: number;       // hrubá tržba dle výpisu od poskytovatele
  vypisProvize: number;
  vypisNet: number;
  posUzaverka: number;     // co řekl POS (uzávěrka karetních plateb)
  bankaPrijato: number;    // co dorazilo na účet
  pocetTrans: number;
  shodaVsPos: boolean;
  shodaVsBanka: boolean;
  komentar?: string;
  vyrizeno?: 'nezpracovano' | 'v-reseni' | 'vyrizeno';
  // Phase 7 — kdo problém řeší + ručně dopárováno
  resitelJmeno?: string;
  resitelRole?: string;
  resitelColor?: string;
  rucneDoparovano?: boolean;
}

interface MonthlyStatement {
  mesic: string;
  label: string;
  stav: 'nahrano' | 'sedi' | 'rozdil' | 'chybi';
  nahranoDatum?: string;
  rozdil?: number;
  poznamka?: string;
  // Phase 7 — detail pro drill-down
  shodaVsPos?: boolean;
  shodaVsBanka?: boolean;
  pdfNazev?: string;
  detail?: {
    vypisSuma: number;
    vypisProvize: number;
    vypisNet: number;
    posCelkem: number;
    bankaCelkem: number;
    pocetTrans: number;
    pocetRefundu: number;
    refundySuma: number;
    daily: DailyComparison[];
    perProvozovna: { provozovnaId: string; suma: number; provize: number; pocet: number }[];
  };
}

function MonthlyStatementsSection({ platforma, onImport, onExport, onOpenDetail }: {
  platforma: PlatformaId;
  onImport: () => void;
  onExport: () => void;
  onOpenDetail: (s: MonthlyStatement) => void;
}) {
  const cfg = PLATFORMS[platforma];
  // Mock data — posledních 6 měsíců, detailní pro Květen 2026 (z reálného Worldline výpisu U Čápa)
  // Daily breakdown — reálná data z PDF: 01.05.–31.05.2026
  const may2026Daily: DailyComparison[] = [
    { datum: '2026-05-01', vypisSuma: 168_001, vypisProvize: 1_135, vypisNet: 166_866, posUzaverka: 168_001, bankaPrijato: 166_866, pocetTrans: 239, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-02', vypisSuma: 179_049, vypisProvize: 1_079, vypisNet: 177_970, posUzaverka: 179_049, bankaPrijato: 177_970, pocetTrans: 254, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-03', vypisSuma: 125_482, vypisProvize:   765, vypisNet: 124_717, posUzaverka: 125_482, bankaPrijato: 124_717, pocetTrans: 209, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-04', vypisSuma: 126_075, vypisProvize:   773, vypisNet: 125_302, posUzaverka: 126_075, bankaPrijato: 125_302, pocetTrans: 321, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-05', vypisSuma: 123_514, vypisProvize:   868, vypisNet: 122_646, posUzaverka: 123_900, bankaPrijato: 122_646, pocetTrans: 326, shodaVsPos: false, shodaVsBanka: true,  komentar: 'POS udává o 386 Kč víc — pravděpodobně odmítnutá platba', vyrizeno: 'v-reseni', resitelJmeno: 'Jana Kovářová', resitelRole: 'Účetní', resitelColor: '#0dcaf0' },
    { datum: '2026-05-06', vypisSuma: 131_794, vypisProvize: 1_008, vypisNet: 130_786, posUzaverka: 131_794, bankaPrijato: 130_786, pocetTrans: 337, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-07', vypisSuma: 151_765, vypisProvize:   872, vypisNet: 150_893, posUzaverka: 151_765, bankaPrijato: 150_893, pocetTrans: 335, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-08', vypisSuma: 169_961, vypisProvize:   953, vypisNet: 169_008, posUzaverka: 169_961, bankaPrijato: 169_008, pocetTrans: 266, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-09', vypisSuma: 169_275, vypisProvize:   897, vypisNet: 168_378, posUzaverka: 169_275, bankaPrijato: 168_378, pocetTrans: 212, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-10', vypisSuma: 123_534, vypisProvize:   783, vypisNet: 122_751, posUzaverka: 123_534, bankaPrijato: 122_751, pocetTrans: 204, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-11', vypisSuma:  98_955, vypisProvize:   593, vypisNet:  98_362, posUzaverka:  98_955, bankaPrijato:  98_362, pocetTrans: 247, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-12', vypisSuma: 120_743, vypisProvize:   713, vypisNet: 120_030, posUzaverka: 120_743, bankaPrijato: 120_030, pocetTrans: 243, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-13', vypisSuma: 142_789, vypisProvize:   921, vypisNet: 141_868, posUzaverka: 142_789, bankaPrijato: 141_868, pocetTrans: 287, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-14', vypisSuma: 134_913, vypisProvize:   822, vypisNet: 134_091, posUzaverka: 134_913, bankaPrijato: 134_091, pocetTrans: 289, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-15', vypisSuma: 110_072, vypisProvize:   632, vypisNet: 109_440, posUzaverka: 110_072, bankaPrijato: 109_440, pocetTrans: 238, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-16', vypisSuma: 125_349, vypisProvize:   721, vypisNet: 124_628, posUzaverka: 125_349, bankaPrijato: 124_628, pocetTrans: 154, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-17', vypisSuma: 116_167, vypisProvize:   741, vypisNet: 115_426, posUzaverka: 116_167, bankaPrijato: 115_426, pocetTrans: 189, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-18', vypisSuma:  86_358, vypisProvize:   474, vypisNet:  85_884, posUzaverka:  86_358, bankaPrijato:  85_884, pocetTrans: 223, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-19', vypisSuma: 124_235, vypisProvize:   849, vypisNet: 123_386, posUzaverka: 124_235, bankaPrijato: 123_386, pocetTrans: 299, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-20', vypisSuma: 162_899, vypisProvize: 1_195, vypisNet: 161_704, posUzaverka: 162_899, bankaPrijato: 161_704, pocetTrans: 383, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-21', vypisSuma: 135_797, vypisProvize:   979, vypisNet: 134_818, posUzaverka: 135_797, bankaPrijato: 134_818, pocetTrans: 357, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-22', vypisSuma: 176_812, vypisProvize: 1_030, vypisNet: 175_782, posUzaverka: 176_812, bankaPrijato: 175_782, pocetTrans: 350, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-23', vypisSuma: 199_955, vypisProvize: 1_145, vypisNet: 198_810, posUzaverka: 199_955, bankaPrijato: 198_810, pocetTrans: 292, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-24', vypisSuma: 179_190, vypisProvize: 1_081, vypisNet: 178_109, posUzaverka: 179_190, bankaPrijato: 178_109, pocetTrans: 257, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-25', vypisSuma: 141_310, vypisProvize:   932, vypisNet: 140_378, posUzaverka: 141_310, bankaPrijato: 140_378, pocetTrans: 311, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-26', vypisSuma: 164_766, vypisProvize: 1_073, vypisNet: 163_693, posUzaverka: 164_766, bankaPrijato: 163_693, pocetTrans: 435, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-27', vypisSuma: 151_656, vypisProvize: 1_078, vypisNet: 150_578, posUzaverka: 151_656, bankaPrijato: 150_578, pocetTrans: 389, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-28', vypisSuma: 132_667, vypisProvize:   846, vypisNet: 131_821, posUzaverka: 132_667, bankaPrijato: 131_821, pocetTrans: 279, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-29', vypisSuma: 155_655, vypisProvize:   921, vypisNet: 154_734, posUzaverka: 155_655, bankaPrijato: 152_734, pocetTrans: 368, shodaVsPos: true,  shodaVsBanka: false, komentar: 'Na účet přišlo o 2 000 Kč míň — eskalováno do banky', vyrizeno: 'v-reseni', resitelJmeno: 'Petr Dohnal', resitelRole: 'Majitel', resitelColor: '#c9911a' },
    { datum: '2026-05-30', vypisSuma: 176_513, vypisProvize: 1_053, vypisNet: 175_460, posUzaverka: 176_513, bankaPrijato: 175_460, pocetTrans: 278, shodaVsPos: true,  shodaVsBanka: true },
    { datum: '2026-05-31', vypisSuma: 136_065, vypisProvize:   772, vypisNet: 135_293, posUzaverka: 136_065, bankaPrijato: 135_293, pocetTrans: 216, shodaVsPos: true,  shodaVsBanka: true },
  ];
  const mayTotals = may2026Daily.reduce((acc, d) => ({
    vypisSuma:    acc.vypisSuma    + d.vypisSuma,
    vypisProvize: acc.vypisProvize + d.vypisProvize,
    vypisNet:     acc.vypisNet     + d.vypisNet,
    posCelkem:    acc.posCelkem    + d.posUzaverka,
    bankaCelkem:  acc.bankaCelkem  + d.bankaPrijato,
    pocetTrans:   acc.pocetTrans   + d.pocetTrans,
  }), { vypisSuma: 0, vypisProvize: 0, vypisNet: 0, posCelkem: 0, bankaCelkem: 0, pocetTrans: 0 });

  // Generátor synthetic detailu pro měsíce bez ručně připravených dat (březen / únor / leden)
  // + jeden problémový den pro duben
  function generateMonthDetail(year: number, month: number, daysCount: number, scale = 1, problemDay?: number): {
    detail: NonNullable<MonthlyStatement['detail']>;
  } {
    const daily: DailyComparison[] = [];
    for (let day = 1; day <= daysCount; day++) {
      const datum = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      // Pseudo-deterministická data
      const base = 120_000 + (day * 1_237) % 80_000;
      const vypisSuma = Math.round(base * scale);
      const vypisProvize = Math.round(vypisSuma * 0.0062);
      const vypisNet = vypisSuma - vypisProvize;
      const pocetTrans = 180 + (day * 17) % 220;
      const isProblem = day === problemDay;
      daily.push({
        datum,
        vypisSuma,
        vypisProvize,
        vypisNet,
        posUzaverka: vypisSuma,
        bankaPrijato: isProblem ? vypisNet - 284 : vypisNet,
        pocetTrans,
        shodaVsPos: true,
        shodaVsBanka: !isProblem,
        komentar: isProblem ? 'AmEx vyšší sazba (4 transakce) — eskalováno na Worldline' : undefined,
        vyrizeno: isProblem ? 'v-reseni' : undefined,
        resitelJmeno: isProblem ? 'Jana Kovářová' : undefined,
        resitelRole:  isProblem ? 'Účetní'        : undefined,
        resitelColor: isProblem ? '#0dcaf0'       : undefined,
      });
    }
    const totals = daily.reduce((acc, d) => ({
      vypisSuma:    acc.vypisSuma    + d.vypisSuma,
      vypisProvize: acc.vypisProvize + d.vypisProvize,
      vypisNet:     acc.vypisNet     + d.vypisNet,
      posCelkem:    acc.posCelkem    + d.posUzaverka,
      bankaCelkem:  acc.bankaCelkem  + d.bankaPrijato,
      pocetTrans:   acc.pocetTrans   + d.pocetTrans,
    }), { vypisSuma: 0, vypisProvize: 0, vypisNet: 0, posCelkem: 0, bankaCelkem: 0, pocetTrans: 0 });
    return {
      detail: {
        ...totals,
        pocetRefundu: 8 + (month * 2) % 6,
        refundySuma:  4_500 + (month * 1_200) % 4_000,
        daily,
        perProvozovna: [{ provozovnaId: 'u-capa', suma: totals.vypisSuma, provize: totals.vypisProvize, pocet: totals.pocetTrans }],
      },
    };
  }

  const aprilGen = generateMonthDetail(2026, 4, 30, 0.95, 17);  // duben — 1 problémový den
  const marchGen = generateMonthDetail(2026, 3, 31, 0.85);      // březen — vše sedí
  const febGen   = generateMonthDetail(2026, 2, 28, 0.80);
  const janGen   = generateMonthDetail(2026, 1, 31, 0.78);

  const statements: MonthlyStatement[] = [
    { mesic: '2026-06', label: 'Červen 2026', stav: 'chybi',  poznamka: 'Aktuální měsíc — čeká na import' },
    {
      mesic: '2026-05', label: 'Květen 2026', stav: 'rozdil', nahranoDatum: '2026-06-03',
      shodaVsPos: false, shodaVsBanka: false, pdfNazev: 'Worldline-U-Capa-2026-05.pdf',
      detail: {
        ...mayTotals,
        pocetRefundu: 12, refundySuma: 8_200,
        daily: may2026Daily,
        perProvozovna: [{ provozovnaId: 'u-capa', suma: mayTotals.vypisSuma, provize: mayTotals.vypisProvize, pocet: mayTotals.pocetTrans }],
      },
    },
    { mesic: '2026-04', label: 'Duben 2026',  stav: 'rozdil', nahranoDatum: '2026-05-02', rozdil: 284, poznamka: 'Vyšší sazba pro AmEx (4 transakce)',
      shodaVsPos: true, shodaVsBanka: false, pdfNazev: 'Worldline-U-Capa-2026-04.pdf', detail: aprilGen.detail },
    { mesic: '2026-03', label: 'Březen 2026', stav: 'sedi',   nahranoDatum: '2026-04-02', shodaVsPos: true, shodaVsBanka: true, pdfNazev: 'Worldline-U-Capa-2026-03.pdf', detail: marchGen.detail },
    { mesic: '2026-02', label: 'Únor 2026',   stav: 'sedi',   nahranoDatum: '2026-03-02', shodaVsPos: true, shodaVsBanka: true, pdfNazev: 'Worldline-U-Capa-2026-02.pdf', detail: febGen.detail },
    { mesic: '2026-01', label: 'Leden 2026',  stav: 'sedi',   nahranoDatum: '2026-02-02', shodaVsPos: true, shodaVsBanka: true, pdfNazev: 'Worldline-U-Capa-2026-01.pdf', detail: janGen.detail },
  ];

  const STAV_META: Record<MonthlyStatement['stav'], { label: string; cls: string; icon: string; bg: string }> = {
    nahrano: { label: 'Nahráno',         cls: 'bg-info-subtle text-info',         icon: 'solar:upload-bold-duotone',         bg: '#e8f7ff' },
    sedi:    { label: 'Sedí',            cls: 'bg-success-subtle text-success',   icon: 'solar:check-circle-bold-duotone',   bg: '#d1f0db' },
    rozdil:  { label: 'Rozdíl',          cls: 'bg-warning-subtle text-warning',   icon: 'solar:danger-triangle-bold-duotone', bg: '#fff3cd' },
    chybi:   { label: 'Chybí výpis',     cls: 'bg-danger-subtle text-danger',     icon: 'solar:bell-bing-bold-duotone',      bg: '#f8d7da' },
  };

  const aktualniMesicChybi = statements[0].stav === 'chybi';

  return (
    <div className="card mb-3" style={{ borderTop: `3px solid ${cfg.color}` }}>
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Měsíční výpisy &amp; kontrola
            <small className="text-muted fw-normal ms-2 fs-13">
              Importované výpisy od poskytovatele platební brány
            </small>
          </h5>
          <div className="ms-auto d-flex gap-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={onExport}
              title="Mock: export rozpadu po provozovnách pro účetního (XLSX)">
              <iconify-icon icon="solar:upload-bold-duotone" className="me-1" />
              Export pro účetního
            </button>
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={onImport}>
              <iconify-icon icon="solar:download-bold-duotone" />
              Import výpisu
            </button>
          </div>
        </div>
      </div>
      <div className="card-body py-3">
        {aktualniMesicChybi && (
          <div className="alert alert-warning py-2 mb-3 fs-12 d-flex align-items-center gap-2">
            <iconify-icon icon="solar:bell-bing-bold-duotone" style={{ fontSize: 18 }} />
            <div className="flex-grow-1">
              <strong>Chybí výpis za aktuální měsíc (červen 2026).</strong> Klikni na <strong>Import výpisu</strong> a nahraj CSV/XLSX od poskytovatele.
              Po importu systém automaticky rozdělí data po provozovnách, vypočítá poplatky a porovná s uzávěrkami + bankou.
            </div>
          </div>
        )}
        <div className="row g-2">
          {statements.map((s) => {
            const sm = STAV_META[s.stav];
            const borderColor = s.stav === 'rozdil' ? '#ffc107' : s.stav === 'chybi' ? '#dc3545' : s.stav === 'sedi' ? '#198754' : '#0dcaf0';
            const isClickable = s.stav !== 'chybi';
            return (
              <div key={s.mesic} className="col-6 col-md-4 col-lg-2">
                <div className="rounded p-3 h-100 d-flex flex-column gap-1 wq-card"
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${borderColor}`,
                    borderTop: `3px solid ${borderColor}`,
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                  onClick={() => isClickable && onOpenDetail(s)}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold fs-13">{s.label}</div>
                    {s.pdfNazev && (
                      <button className="btn btn-link btn-sm p-0 text-muted" title={`Stáhnout ${s.pdfNazev}`}
                        onClick={(e) => { e.stopPropagation(); alert(`Mock: stahuje se ${s.pdfNazev}`); }}>
                        <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                  {s.nahranoDatum && (
                    <div className="text-muted fs-11 czk-num">Nahráno: {fDate(s.nahranoDatum)}</div>
                  )}
                  {/* 2 status indikátory: vs POS + vs Banka (per zápis 12. 6. 2026) */}
                  {s.stav !== 'chybi' && (
                    <div className="d-flex flex-column gap-1 mt-1">
                      <div className="d-flex align-items-center gap-1" style={{ fontSize: 10 }}>
                        <iconify-icon icon={s.shodaVsPos ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                          style={{ fontSize: 12, color: s.shodaVsPos ? '#198754' : '#dc3545' }} />
                        <span className="text-muted">vs POS uzávěrky:</span>
                        <strong style={{ color: s.shodaVsPos ? '#198754' : '#dc3545' }}>{s.shodaVsPos ? 'sedí' : 'rozdíl'}</strong>
                      </div>
                      <div className="d-flex align-items-center gap-1" style={{ fontSize: 10 }}>
                        <iconify-icon icon={s.shodaVsBanka ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                          style={{ fontSize: 12, color: s.shodaVsBanka ? '#198754' : '#dc3545' }} />
                        <span className="text-muted">vs Banka:</span>
                        <strong style={{ color: s.shodaVsBanka ? '#198754' : '#dc3545' }}>{s.shodaVsBanka ? 'sedí' : 'rozdíl'}</strong>
                      </div>
                    </div>
                  )}
                  {s.stav === 'chybi' && (
                    <span className={`badge ${sm.cls} align-self-start mt-1`} style={{ fontSize: 9 }}>
                      <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 10 }} />
                      {sm.label}
                    </span>
                  )}
                  {s.poznamka && (
                    <div className="text-muted fs-11 fst-italic mt-auto">{s.poznamka}</div>
                  )}
                  {isClickable && s.detail && (
                    <div className="text-primary fs-11 fw-semibold mt-auto d-flex align-items-center gap-1">
                      <span>Otevřít detail</span>
                      <iconify-icon icon="solar:alt-arrow-right-bold" style={{ fontSize: 11 }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-muted fs-11 mt-3">
          <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
          Per zápis 12. 6. 2026 — denní kontrola plateb kartou je nerealistická. Přechází se na měsíční kontrolu pomocí importu výpisu.
          Po importu systém porovná data s uzávěrkami a bankou, upozorní na rozdíly.
        </div>
      </div>
    </div>
  );
}

// Phase 7 (zápis 12. 6. 2026) — drill-down detail měsíčního výpisu
// 3-way comparison: Výpis × POS × Banka per den + interaktivní řešení problémů
function MonthlyDetailModal({ statement, onClose }: { statement: MonthlyStatement; onClose: () => void }) {
  // Session-local změny — řešitel, poznámky, manuální dopárování
  const [overrides, setOverrides] = useState<Record<string, Partial<DailyComparison>>>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  if (!statement.detail) return null;
  const d = statement.detail;

  // Mock seznam uživatelů pro výběr řešitele
  const RESITELE = [
    { jmeno: 'Petr Dohnal',     role: 'Majitel',  color: '#c9911a' },
    { jmeno: 'Jana Kovářová',   role: 'Účetní',   color: '#0dcaf0' },
    { jmeno: 'Martin Procházka', role: 'Provoz',  color: '#198754' },
    { jmeno: 'Zdeňka Fiala',    role: 'Asistent', color: '#6f42c1' },
  ];

  const getEffective = (day: DailyComparison): DailyComparison => ({ ...day, ...overrides[day.datum] });
  const patchDay = (datum: string, patch: Partial<DailyComparison>) => {
    setOverrides((prev) => ({ ...prev, [datum]: { ...prev[datum], ...patch } }));
  };
  const initials = (jmeno: string) => jmeno.split(' ').map((p) => p[0]).join('').toUpperCase();
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 22 }} />
                Detail výpisu — {statement.label}
              </h5>
              <div className="d-flex align-items-center gap-2 ms-auto me-3">
                {statement.pdfNazev && (
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => alert(`Mock: stahuje se ${statement.pdfNazev}`)}>
                    <iconify-icon icon="solar:document-text-bold-duotone" className="me-1" />
                    Stáhnout PDF
                  </button>
                )}
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              {/* Souhrn */}
              <div className="row g-2 mb-3">
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted fs-11 text-uppercase fw-semibold">Hrubá tržba</div>
                    <div className="czk-num fw-bold" style={{ fontSize: 16 }}>{fCzk(Math.round(d.vypisSuma))}</div>
                    <div className="text-muted fs-11">{d.pocetTrans} transakcí</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted fs-11 text-uppercase fw-semibold">Provize</div>
                    <div className="czk-num fw-bold text-danger" style={{ fontSize: 16 }}>−{fCzk(Math.round(d.vypisProvize))}</div>
                    <div className="text-muted fs-11">{(d.vypisProvize / d.vypisSuma * 100).toFixed(2)} % z tržby</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted fs-11 text-uppercase fw-semibold">Net (na účet)</div>
                    <div className="czk-num fw-bold text-success" style={{ fontSize: 16 }}>{fCzk(Math.round(d.vypisNet))}</div>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted fs-11 text-uppercase fw-semibold">Refundy</div>
                    <div className="czk-num fw-bold" style={{ fontSize: 16 }}>{d.pocetRefundu}× / −{fCzk(d.refundySuma)}</div>
                  </div>
                </div>
              </div>

              {/* Shrnutí spárování */}
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <div className={`p-2 rounded ${statement.shodaVsPos ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                    <div className="d-flex align-items-center gap-2">
                      <iconify-icon icon={statement.shodaVsPos ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                        style={{ fontSize: 22, color: statement.shodaVsPos ? '#198754' : '#dc3545' }} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold fs-13">vs. POS uzávěrky</div>
                        <div className="fs-12">
                          POS celkem: <strong className="czk-num">{fCzk(Math.round(d.posCelkem))}</strong> ·
                          Výpis: <strong className="czk-num">{fCzk(Math.round(d.vypisSuma))}</strong> ·
                          Rozdíl: <strong className={`czk-num ${d.vypisSuma === d.posCelkem ? 'text-success' : 'text-danger'}`}>
                            {d.vypisSuma === d.posCelkem ? '0 Kč' : fCzk(Math.abs(d.vypisSuma - d.posCelkem)) + ' Kč'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className={`p-2 rounded ${statement.shodaVsBanka ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                    <div className="d-flex align-items-center gap-2">
                      <iconify-icon icon={statement.shodaVsBanka ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                        style={{ fontSize: 22, color: statement.shodaVsBanka ? '#198754' : '#dc3545' }} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold fs-13">vs. Banka (přijaté platby)</div>
                        <div className="fs-12">
                          Banka přijato: <strong className="czk-num">{fCzk(Math.round(d.bankaCelkem))}</strong> ·
                          Net výpis: <strong className="czk-num">{fCzk(Math.round(d.vypisNet))}</strong> ·
                          Rozdíl: <strong className={`czk-num ${d.vypisNet === d.bankaCelkem ? 'text-success' : 'text-danger'}`}>
                            {d.vypisNet === d.bankaCelkem ? '0 Kč' : fCzk(Math.abs(d.vypisNet - d.bankaCelkem)) + ' Kč'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-way comparison: denní rozpis */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14, color: '#fd7e14' }} />
                <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>
                  Denní srovnání — Výpis × POS × Banka
                </div>
              </div>
              <div className="alert alert-info py-2 mb-2 fs-12">
                <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                Dny, kde údaje nesedí, jsou zvýrazněné. Lze je opatřit komentářem („vyřízeno kým / jak").
              </div>
              <div className="table-responsive" style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table className="table table-sm mb-0" style={{ fontSize: 11 }}>
                  <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Datum</th>
                      <th className="text-end"># Trans</th>
                      <th className="text-end">Výpis (hrubá)</th>
                      <th className="text-end">POS</th>
                      <th className="text-end">vs POS</th>
                      <th className="text-end">Net</th>
                      <th className="text-end">Banka</th>
                      <th className="text-end">vs Banka</th>
                      <th>Stav / Řeší</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.daily.map((origDay) => {
                      const day = getEffective(origDay);
                      const isProblem = !day.shodaVsPos || !day.shodaVsBanka || day.rucneDoparovano;
                      const isExpanded = expandedDay === day.datum;
                      const diffPos   = day.vypisSuma - day.posUzaverka;
                      const diffBanka = day.vypisNet  - day.bankaPrijato;
                      const isVyrizeno = day.vyrizeno === 'vyrizeno' || day.rucneDoparovano;
                      const rowBg = isVyrizeno ? '#e8f6ed' : isProblem ? '#fff8e6' : undefined;
                      return (
                        <Fragment key={day.datum}>
                          <tr style={{
                            background: rowBg,
                            cursor: isProblem ? 'pointer' : 'default',
                          }}
                            onClick={() => { if (isProblem) setExpandedDay(isExpanded ? null : day.datum); }}>
                            <td className="czk-num">{fDate(day.datum)}</td>
                            <td className="text-end czk-num text-muted">{day.pocetTrans}</td>
                            <td className="text-end czk-num">{fCzk(Math.round(day.vypisSuma))}</td>
                            <td className="text-end czk-num">{fCzk(Math.round(day.posUzaverka))}</td>
                            <td className={`text-end czk-num fw-semibold ${day.shodaVsPos ? 'text-success' : 'text-danger'}`}>
                              {day.shodaVsPos ? '✓' : `${diffPos > 0 ? '+' : ''}${fCzk(diffPos)}`}
                            </td>
                            <td className="text-end czk-num text-muted">{fCzk(Math.round(day.vypisNet))}</td>
                            <td className="text-end czk-num">{fCzk(Math.round(day.bankaPrijato))}</td>
                            <td className={`text-end czk-num fw-semibold ${day.shodaVsBanka ? 'text-success' : 'text-danger'}`}>
                              {day.shodaVsBanka ? '✓' : `${diffBanka > 0 ? '+' : ''}${fCzk(diffBanka)}`}
                            </td>
                            <td>
                              {isProblem ? (
                                <div className="d-flex align-items-center gap-1">
                                  {/* Stav badge */}
                                  <span className={`badge ${
                                    isVyrizeno ? 'bg-success-subtle text-success' :
                                    day.vyrizeno === 'v-reseni' ? 'bg-warning-subtle text-warning' :
                                    'bg-danger-subtle text-danger'
                                  }`} style={{ fontSize: 9 }}>
                                    {isVyrizeno ? 'Vyřízeno' : day.vyrizeno === 'v-reseni' ? 'V řešení' : 'Nezpracováno'}
                                  </span>
                                  {/* Avatar řešitele */}
                                  {day.resitelJmeno && (
                                    <span
                                      className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white"
                                      style={{ width: 18, height: 18, fontSize: 8, background: day.resitelColor ?? '#6c757d' }}
                                      title={`${day.resitelJmeno} (${day.resitelRole})`}>
                                      {initials(day.resitelJmeno)}
                                    </span>
                                  )}
                                  {/* Šipka rozbalit */}
                                  <iconify-icon icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                                    style={{ fontSize: 12, color: '#6c757d', marginLeft: 'auto' }} />
                                </div>
                              ) : (
                                <span className="text-success fs-11">✓ Sedí</span>
                              )}
                            </td>
                          </tr>
                          {/* Editor pro problémový den */}
                          {isExpanded && isProblem && (
                            <tr style={{ background: '#f0f7ff' }}>
                              <td colSpan={9} className="p-3">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <iconify-icon icon="solar:pen-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
                                  <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#0d6efd' }}>
                                    Řešení nesouladu — {fDate(day.datum)}
                                  </div>
                                </div>
                                <div className="row g-2 mb-2">
                                  <div className="col-md-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">Řeší</label>
                                    <select className="form-select form-select-sm"
                                      value={day.resitelJmeno ?? ''}
                                      onChange={(e) => {
                                        const r = RESITELE.find((x) => x.jmeno === e.target.value);
                                        patchDay(day.datum, {
                                          resitelJmeno: r?.jmeno,
                                          resitelRole:  r?.role,
                                          resitelColor: r?.color,
                                          vyrizeno: r ? 'v-reseni' : 'nezpracovano',
                                        });
                                      }}>
                                      <option value="">— nepřiděleno —</option>
                                      {RESITELE.map((r) => (
                                        <option key={r.jmeno} value={r.jmeno}>{r.jmeno} ({r.role})</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-md-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">Stav</label>
                                    <select className="form-select form-select-sm"
                                      value={day.vyrizeno ?? 'nezpracovano'}
                                      onChange={(e) => patchDay(day.datum, { vyrizeno: e.target.value as DailyComparison['vyrizeno'] })}>
                                      <option value="nezpracovano">Nezpracováno</option>
                                      <option value="v-reseni">V řešení</option>
                                      <option value="vyrizeno">Vyřízeno</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="form-label fs-11 fw-semibold mb-1">Poznámka / komentář</label>
                                  <textarea className="form-control form-control-sm"
                                    style={{ fontSize: 12, resize: 'vertical' }}
                                    rows={2}
                                    placeholder="např. Volal jsem na Worldline, prověřují to. Zpětně potvrdili 12. 6."
                                    value={day.komentar ?? ''}
                                    onChange={(e) => patchDay(day.datum, { komentar: e.target.value })} />
                                </div>
                                <div className="d-flex gap-2 align-items-center flex-wrap">
                                  <button className="btn btn-primary btn-sm"
                                    onClick={() => patchDay(day.datum, { rucneDoparovano: true, vyrizeno: 'vyrizeno' })}>
                                    <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                                    Dopárovat ručně
                                  </button>
                                  <button className="btn btn-outline-success btn-sm"
                                    onClick={() => patchDay(day.datum, { vyrizeno: 'vyrizeno' })}>
                                    <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                                    Označit jako vyřízené
                                  </button>
                                  <div className="text-muted fs-11 ms-2">
                                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                                    „Dopárovat ručně" = označit rozdíl jako akceptovaný a uzavřít.
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Zavřít</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// ──────────────────────────────────────────────────────────────
// KPI strip — používá skutečný poplatek tam kde známe
// ──────────────────────────────────────────────────────────────
function KpiStrip({ platforma, denni }: { platforma: PlatformaId; denni: DenniParovani[] }) {
  const cfg = PLATFORMS[platforma];
  const tenMonth = '2026-06';
  const tenni = denni.filter((d) => d.datum.slice(0, 7) === tenMonth);
  const prijmyTentoMesic = tenni.reduce((s, d) => s + d.trzbaPos, 0);
  // Poplatek = skutečný (kde máme) jinak odhad
  const poplatkyTentoMesic = tenni.reduce((s, d) => {
    const skut = skutecnyPoplatek(d);
    return s + (skut !== null ? skut : d.poplatekOdhad);
  }, 0);
  const marzePct = prijmyTentoMesic > 0 ? (1 - poplatkyTentoMesic / prijmyTentoMesic) * 100 : 0;
  const nesparovane = denni.filter((d) => d.stav === 'ceka-na-D1' || d.stav === 'neprislo').length;
  const rozdily     = denni.filter((d) => d.stav === 'rozdil' || d.stav === 'neprislo').length;
  const nepriraz    = denni.filter((d) => !d.provozovnaId).length;

  const cisty       = prijmyTentoMesic - poplatkyTentoMesic;
  const provizePct  = prijmyTentoMesic > 0 ? (poplatkyTentoMesic / prijmyTentoMesic) * 100 : 0;
  const kVyreseni   = rozdily + nesparovane + nepriraz;

  return (
    <div className="row g-2 mb-3">
      <div className="col-6 col-md-3">
        <KpiBox
          label="Příjmy v červnu"
          value={fCzk(Math.round(prijmyTentoMesic))}
          icon="solar:dollar-minimalistic-bold-duotone"
          iconColor={cfg.color}
          sub="hrubá tržba (POS)"
          footer={{ label: 'Čistá po provizi', value: fCzk(Math.round(cisty)) }}
        />
      </div>
      <div className="col-6 col-md-3">
        <KpiBox
          label="Provize červen"
          value={`−${fCzk(Math.round(poplatkyTentoMesic))}`}
          icon="solar:tag-price-bold-duotone"
          iconColor="#dc3545"
          sub={`≈ ${cfg.poplatekPctOdhad} % odhad`}
          footer={{ label: 'Z hrubé tržby', value: `${provizePct.toFixed(1)} %` }}
        />
      </div>
      <div className="col-6 col-md-3">
        <KpiBox
          label="Marže (po provizi)"
          value={`${marzePct.toFixed(1)} %`}
          icon="solar:graph-up-bold-duotone"
          iconColor="#198754"
          sub="čistý příjem / hrubá tržba"
        />
      </div>
      <div className="col-6 col-md-3">
        <KpiBox
          label="K vyřešení"
          value={String(kVyreseni)}
          icon="solar:danger-triangle-bold-duotone"
          iconColor={kVyreseni > 0 ? '#dc3545' : '#9097a7'}
          sub={`${nesparovane} čeká · ${rozdily} rozdíl · ${nepriraz} bez provoz`}
          alert={kVyreseni > 0}
          badge={kVyreseni > 0 ? { text: '', tone: 'danger', icon: 'solar:danger-triangle-bold-duotone' } : undefined}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Per-provozovna breakdown — měsíční souhrny per venue
// ──────────────────────────────────────────────────────────────
function VenueBreakdown({ platforma, denni, activeProv, onSetProv }: {
  platforma: PlatformaId; denni: DenniParovani[];
  activeProv: string;
  onSetProv: (id: string) => void;
}) {
  const cfg = PLATFORMS[platforma];
  const tenMonth = '2026-06';
  const tenni = denni.filter((d) => d.datum.slice(0, 7) === tenMonth);

  // Sumy per provozovna
  const rows = cfg.provozovny.map((provId) => {
    const own = tenni.filter((d) => d.provozovnaId === provId);
    const trzba = own.reduce((s, d) => s + d.trzbaPos, 0);
    const poplatek = own.reduce((s, d) => {
      const skut = skutecnyPoplatek(d);
      return s + (skut !== null ? skut : d.poplatekOdhad);
    }, 0);
    return { provId, trzba, poplatek, cisty: trzba - poplatek, pocet: own.length };
  }).sort((a, b) => b.trzba - a.trzba);

  // Nepřiřazené sumy
  const unassigned = tenni.filter((d) => !d.provozovnaId);
  const unassignedTrzba = unassigned.reduce((s, d) => s + d.trzbaPos, 0);

  const allCelkem = rows.reduce((s, r) => s + r.trzba, 0);

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <div className="d-flex align-items-center gap-2">
          <iconify-icon icon="solar:buildings-3-bold-duotone" style={{ fontSize: 14, color: cfg.color }} />
          <div className="fw-semibold fs-13">Rozdělení po provozovnách (červen)</div>
          <span className="text-muted fs-11 d-none d-md-inline">Klikni pro filtraci tabulky</span>
          {activeProv && (
            <button className="btn btn-link btn-sm p-0 ms-auto text-muted" style={{ fontSize: 12 }} onClick={() => onSetProv('')}>
              Zrušit filtr ×
            </button>
          )}
        </div>
      </div>
      <div className="card-body py-2">
        {/* Hlavička sloupců — Phase 7 (zápis 19. 6. 2026): chyběly popisky, uživatel netušil co je co */}
        <div className="d-flex align-items-center gap-2 py-1 px-2 mb-1 text-muted fs-11 fw-semibold text-uppercase"
          style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef' }}>
          <span style={{ width: 10 }} />
          <div style={{ width: 130, flexShrink: 0 }}>Provozovna</div>
          <div className="flex-grow-1" title="Procentní podíl provozovny na celkové tržbě za měsíc">Podíl na celku</div>
          <div className="d-flex align-items-center gap-2" style={{ width: 240, justifyContent: 'flex-end' }}>
            <span style={{ minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap' }} title="Celková tržba — kolik proteklo touto platební metodou">Hrubá tržba</span>
            <span style={{ minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }} title="Provize banky (záporná, odečte se z tržby)">Provize</span>
            <span style={{ minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap' }} title="Čistý příjem na účet (Hrubá − Provize)">Čistý příjem</span>
          </div>
        </div>
        <div className="d-flex flex-column gap-1">
          {rows.map((r) => {
            const meta = PROVOZOVNY.find((p) => p.id === r.provId);
            const isActive = activeProv === r.provId;
            const pct = allCelkem > 0 ? (r.trzba / allCelkem) * 100 : 0;
            return (
              <button key={r.provId}
                onClick={() => onSetProv(isActive ? '' : r.provId)}
                className="d-flex align-items-center gap-2 py-1 px-2 rounded border-0 text-start w-100"
                style={{ background: isActive ? `${meta?.color}26` : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                title={`${meta?.name ?? r.provId} — podíl ${pct.toFixed(1)} %`}>
                <span className="rounded-circle flex-shrink-0" style={{ width: 10, height: 10, background: meta?.color ?? '#9097a7', display: 'inline-block' }} />
                <div style={{ width: 130, flexShrink: 0 }} className="fs-12 fw-semibold text-truncate">{meta?.shortName ?? r.provId}</div>
                <div className="flex-grow-1 position-relative" style={{ height: 6, background: '#f1f3f5', borderRadius: 3 }}
                  title={`${pct.toFixed(1)} % z měsíční tržby`}>
                  <div style={{ width: `${pct}%`, height: '100%', background: meta?.color ?? cfg.color, borderRadius: 3 }} />
                </div>
                <div className="d-flex align-items-center gap-2" style={{ width: 240, justifyContent: 'flex-end' }}>
                  <span className="czk-num fw-semibold fs-12" style={{ minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap' }}>{fCzk(Math.round(r.trzba))}</span>
                  <span className="text-muted fs-11 czk-num" style={{ minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }}>−{fCzk(Math.round(r.poplatek))}</span>
                  <span className="text-success fw-semibold fs-12 czk-num" style={{ minWidth: 80, textAlign: 'right', whiteSpace: 'nowrap' }}>{fCzk(Math.round(r.cisty))}</span>
                </div>
              </button>
            );
          })}
          {unassigned.length > 0 && (
            <button onClick={() => onSetProv(activeProv === '__unassigned' ? '' : '__unassigned')}
              className="d-flex align-items-center gap-2 py-1 px-2 rounded border-0 text-start w-100 mt-1"
              style={{ background: activeProv === '__unassigned' ? '#fdf3f4' : '#fafbfc', cursor: 'pointer', borderTop: '1px dashed #dee2e6' }}>
              <iconify-icon icon="solar:question-circle-bold-duotone" style={{ fontSize: 14, color: '#dc3545' }} />
              <div className="fs-12 fw-semibold text-danger" style={{ width: 130 }}>Nepřiřazeno ({unassigned.length})</div>
              <div className="flex-grow-1 fs-11 text-muted fst-italic">Vyžaduje ruční přiřazení k provozovně</div>
              <span className="czk-num fw-semibold fs-12 text-danger">{fCzk(Math.round(unassignedTrzba))}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tabulka denního párování
// ──────────────────────────────────────────────────────────────
function DailyTable({ platforma, data, search, setSearch, stavFilter, setStavFilter, provFilter, datumOd, setDatumOd, datumDo, setDatumDo, reconciled, onOpenImport, onAssignProvozovna }: {
  platforma: PlatformaId;
  data: DenniParovani[];
  search: string;
  setSearch: (s: string) => void;
  stavFilter: DenniParovani['stav'] | 'all';
  setStavFilter: (s: DenniParovani['stav'] | 'all') => void;
  provFilter: string;
  datumOd: string;
  setDatumOd: (s: string) => void;
  datumDo: string;
  setDatumDo: (s: string) => void;
  reconciled: boolean;
  onOpenImport?: () => void;
  onAssignProvozovna: (recordId: string, provId: string) => void;
}) {
  return (
    <div className="card mb-3">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Denní párování (POS vs. příchozí D+1)
            <small className="text-muted fw-normal ms-2 fs-13">{data.length} záznamů</small>
          </h5>
          {onOpenImport && (
            <button className="btn btn-primary btn-sm ms-auto d-flex align-items-center gap-2" onClick={onOpenImport}
              title="Nahrát přehled / výpis od poskytovatele a zkontrolovat s bankou">
              <iconify-icon icon="solar:upload-bold-duotone" />
              Nahrát přehled
            </button>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat datum / poznámku…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={stavFilter} onChange={(e) => setStavFilter(e.target.value as DenniParovani['stav'] | 'all')}>
            <option value="all">Všechny stavy</option>
            {Object.entries(PAR_STAV_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {/* Filtr období od–do */}
          <div className="d-flex align-items-center gap-1">
            <span className="text-muted fs-12">Od</span>
            <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
              value={datumOd} onChange={(e) => setDatumOd(e.target.value)} />
            <span className="text-muted fs-12">Do</span>
            <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
              value={datumDo} onChange={(e) => setDatumDo(e.target.value)} />
            {(datumOd || datumDo) && (
              <button className="btn btn-link btn-sm p-0 text-muted" title="Vyčistit období"
                onClick={() => { setDatumOd(''); setDatumDo(''); }}>
                <iconify-icon icon="solar:close-circle-bold-duotone" style={{ fontSize: 16 }} />
              </button>
            )}
          </div>
          {provFilter && (
            <span className="badge bg-info-subtle text-info" style={{ fontSize: 11 }}>
              <iconify-icon icon="solar:buildings-3-bold-duotone" className="me-1" style={{ fontSize: 11 }} />
              Filtr: {provFilter === '__unassigned' ? 'Nepřiřazené' : getProvNazev(provFilter)}
            </span>
          )}
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Provozovna</th>
              <th className="text-end">Tržba POS</th>
              <th className="text-end">Příchozí (D+1)</th>
              <th className="text-end">Provize skut.</th>
              <th className="text-end">Provize odhad</th>
              <th className="text-end">Δ odhadu</th>
              <th>Stav</th>
              <th>Banka</th>
              <th>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={10} className="text-center py-4 text-muted">Žádné záznamy nesplňují filtr</td></tr>
            )}
            {data.map((d) => {
              const sm = PAR_STAV_META[d.stav];
              const isRozdil = d.stav === 'rozdil' || d.stav === 'neprislo';
              const isUnassigned = !d.provozovnaId;
              const skut = skutecnyPoplatek(d);
              const odchylka = odchylkaOdhadu(d);
              return (
                <tr key={d.id} style={
                  isRozdil ? { background: '#fdf3f4' }
                  : isUnassigned ? { background: '#fffaf3' }
                  : undefined
                }>
                  <td className="czk-num fw-semibold">{fDate(d.datum)}</td>
                  <td>
                    {d.provozovnaId ? (
                      <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1" style={{ fontSize: 10 }}>
                        <span className="rounded-circle" style={{ width: 7, height: 7, background: getProvColor(d.provozovnaId), display: 'inline-block' }} />
                        {getProvNazev(d.provozovnaId)}
                      </span>
                    ) : (
                      <select
                        className="form-select form-select-sm py-0"
                        style={{ fontSize: 11, height: 24, maxWidth: 160, background: '#fff' }}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) onAssignProvozovna(d.id, e.target.value);
                        }}>
                        <option value="" disabled>Přiřadit…</option>
                        {PLATFORMS[platforma].provozovny.map((pid) => (
                          <option key={pid} value={pid}>{getProvNazev(pid)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="text-end czk-num">{fCzk(d.trzbaPos)}</td>
                  <td className="text-end czk-num">
                    {d.prislo === null ? <span className="text-muted">—</span> : fCzk(d.prislo)}
                  </td>
                  <td className="text-end czk-num text-danger">
                    {skut === null ? <span className="text-muted">—</span> : `−${fCzk(Math.round(skut))}`}
                  </td>
                  <td className="text-end czk-num text-muted">−{fCzk(d.poplatekOdhad)}</td>
                  <td className={`text-end czk-num fw-semibold ${odchylka === null ? 'text-muted' : Math.abs(odchylka) < 5 ? 'text-success' : 'text-warning'}`}>
                    {odchylka === null ? '—' : (odchylka > 0 ? '+' : '') + fCzk(Math.round(odchylka))}
                  </td>
                  <td>
                    <span className={`badge ${sm.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 10 }} />
                      {sm.label}
                    </span>
                  </td>
                  <td>
                    {!reconciled ? (
                      <span className="badge bg-light text-muted border" style={{ fontSize: 10 }} title="Nahrajte přehled pro ověření s bankou">
                        <iconify-icon icon="solar:minus-circle-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        Nezkontrolováno
                      </span>
                    ) : d.stav === 'neprislo' ? (
                      <span className="badge bg-danger-subtle text-danger" style={{ fontSize: 10 }} title="Platba nedorazila do banky">
                        <iconify-icon icon="solar:close-circle-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        Nedorazilo
                      </span>
                    ) : d.stav === 'rozdil' ? (
                      <span className="badge bg-warning-subtle text-warning" style={{ fontSize: 10 }} title="Dorazilo, ale částka nesedí">
                        <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        Nesedí
                      </span>
                    ) : (
                      <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }} title="Ověřeno — platba dorazila do banky">
                        <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        V bance
                      </span>
                    )}
                  </td>
                  <td className="text-muted fs-11">{d.poznamka ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Měsíční faktury
// ──────────────────────────────────────────────────────────────
function MonthlyInvoicesTable({ platforma }: { platforma: PlatformaId }) {
  const { faktury } = getDataForPlatforma(platforma);
  if (faktury.length === 0) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          Měsíční faktury od poskytovatele
          <small className="text-muted fw-normal ms-2 fs-13">{faktury.length} faktury</small>
        </h5>
        <div className="text-muted fs-12 mt-1">
          Souhrn za měsíc — kontrola, zda denní skutečné provize sedí s fakturou.
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Měsíc</th>
              <th>Vydána</th>
              <th>Splatnost</th>
              <th className="text-end">Tržba</th>
              <th className="text-end">Faktura — poplatek</th>
              <th className="text-end">Náš výpočet</th>
              <th className="text-end">Rozdíl</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {faktury.map((f) => {
              const sm = FAKT_STAV_META[f.stav];
              return (
                <tr key={f.id} style={f.stav === 'rozdil' ? { background: '#fff8e6' } : undefined}>
                  <td className="fw-semibold">{f.mesic}</td>
                  <td className="czk-num">{fDate(f.vydanaDatum)}</td>
                  <td className="czk-num">{fDate(f.splatnost)}</td>
                  <td className="text-end czk-num">{fCzk(f.prijmuCelkem)}</td>
                  <td className="text-end czk-num text-danger">−{fCzk(f.poplatekFakturovany)}</td>
                  <td className="text-end czk-num text-muted">−{fCzk(f.poplatekOdhadnuty)}</td>
                  <td className={`text-end czk-num fw-bold ${f.rozdil > 0 ? 'text-warning' : f.rozdil < 0 ? 'text-success' : 'text-muted'}`}>
                    {f.rozdil === 0 ? '0' : (f.rozdil > 0 ? '+' : '') + fCzk(f.rozdil)}
                  </td>
                  <td>
                    <span className={`badge ${sm.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 10 }} />
                      {sm.label}
                    </span>
                    {f.poznamka && (
                      <div className="text-muted fs-11 fst-italic mt-1">{f.poznamka}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main view
// ──────────────────────────────────────────────────────────────
export default function PaymentPlatformView({ platforma }: Props) {
  const { denni } = getDataForPlatforma(platforma);
  const [search, setSearch]         = useState('');
  const [stavFilter, setStavFilter] = useState<DenniParovani['stav'] | 'all'>('all');
  const [provFilter, setProvFilter] = useState<string>('');
  const [datumOd, setDatumOd] = useState('');
  const [datumDo, setDatumDo] = useState('');
  // Po nahrání přehledu — doplní skutečnou provizi + ověří platby s bankou
  const [reconciled, setReconciled] = useState(false);
  // Lokální session přiřazení provozoven (uživatel ručně dopáruje)
  const [localProvAssign, setLocalProvAssign] = useState<Record<string, string>>({});

  // Aplikuj lokální přiřazení
  const merged: DenniParovani[] = useMemo(() => {
    return denni.map((d) => {
      let r: DenniParovani = localProvAssign[d.id] ? { ...d, provozovnaId: localProvAssign[d.id] } : d;
      // Po nahrání přehledu se u čekajících (D+1) doplní skutečný příchozí + provize a potvrdí banka
      if (reconciled && r.stav === 'ceka-na-D1') {
        const prislo = r.trzbaPos - r.poplatekOdhad;
        r = { ...r, prislo, rozdil: prislo - r.trzbaPos, stav: 'sparovane' };
      }
      return r;
    });
  }, [denni, localProvAssign, reconciled]);

  const filtered = useMemo(() => {
    return merged.filter((d) => {
      if (stavFilter !== 'all' && d.stav !== stavFilter) return false;
      if (provFilter === '__unassigned') {
        if (d.provozovnaId) return false;
      } else if (provFilter && d.provozovnaId !== provFilter) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!d.datum.includes(q) && !(d.poznamka ?? '').toLowerCase().includes(q)) return false;
      }
      if (datumOd && d.datum < datumOd) return false;
      if (datumDo && d.datum > datumDo) return false;
      return true;
    }).sort((a, b) => b.datum.localeCompare(a.datum));
  }, [merged, stavFilter, provFilter, search, datumOd, datumDo]);

  // Phase 7 — toast pro import/export akce + modal s detailem měsíčního výpisu
  const [toast, setToast] = useState<string | null>(null);
  const [detailStatement, setDetailStatement] = useState<MonthlyStatement | null>(null);
  // Phase 8.5 (zápis 12. 6. 2026) — Manuální import s preview parsingu
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <>
      {/* Phase 7 — info banner pro GoPay (nesoulad 139k Kč v řešení) */}
      {platforma === 'gopay' && <GoPayAlertBanner />}

      <KpiStrip platforma={platforma} denni={merged} />

      {/* Výpis párovatelný s bankou — přímo pod KPI + od-do filtr + CTA „Nahrát přehled" */}
      <DailyTable
        platforma={platforma}
        data={filtered}
        search={search} setSearch={setSearch}
        stavFilter={stavFilter} setStavFilter={setStavFilter}
        provFilter={provFilter}
        datumOd={datumOd} setDatumOd={setDatumOd}
        datumDo={datumDo} setDatumDo={setDatumDo}
        reconciled={reconciled}
        onOpenImport={() => setImportModalOpen(true)}
        onAssignProvozovna={(recordId, provId) => {
          setLocalProvAssign((prev) => ({ ...prev, [recordId]: provId }));
        }}
      />

      {/* Phase 7 — měsíční výpisy pro terminál (per zápis 12. 6. 2026 — měsíční > denní) */}
      {platforma === 'terminal' && (
        <MonthlyStatementsSection
          platforma={platforma}
          onImport={() => setToast('Mock: Výpis nahrán. Auto-rozdělení po provozovnách + porovnání s uzávěrkami spuštěno.')}
          onExport={() => setToast('Mock: Rozpad po provozovnách exportován do XLSX (pro účetního).')}
          onOpenDetail={(s) => setDetailStatement(s)}
        />
      )}
      {detailStatement && (
        <MonthlyDetailModal statement={detailStatement} onClose={() => setDetailStatement(null)} />
      )}

      <VenueBreakdown
        platforma={platforma}
        denni={merged}
        activeProv={provFilter}
        onSetProv={setProvFilter}
      />
      <MonthlyInvoicesTable platforma={platforma} />

      {toast && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1080 }}>
          <div className="alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2 shadow-sm" style={{ minWidth: 260 }}>
            <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
            <span className="fs-13">{toast}</span>
          </div>
        </div>
      )}

      {/* Phase 8.5 (zápis 12. 6. 2026) — Manuální import dat (CSV/XLSX) s preview parsingu */}
      {importModalOpen && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1400 }} onClick={() => { setImportModalOpen(false); setImportFile(null); }} />
          <div className="modal fade show d-block" style={{ zIndex: 1500 }} tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <iconify-icon icon="solar:upload-bold-duotone" style={{ color: '#fd7e14' }} />
                    Nahrát přehled — {PLATFORMS[platforma].nazev}
                  </h5>
                  <button className="btn-close" onClick={() => { setImportModalOpen(false); setImportFile(null); }} />
                </div>
                <div className="modal-body">
                  {!importFile ? (
                    <>
                      <div className="alert alert-info py-2 fs-12">
                        <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                        Nahrajte přehled / výpis od <strong>{PLATFORMS[platforma].nazev}</strong> (CSV nebo XLSX). Po nahrání se
                        zobrazí náhled a porovná se s bankou — pro kontrolu párování a provizí.
                      </div>
                      <div className="border border-2 border-dashed rounded p-5 text-center" style={{ borderColor: '#dee2e6', cursor: 'pointer' }}
                        onClick={() => setImportFile('sodexo-vypis-04-2026.csv')}>
                        <iconify-icon icon="solar:cloud-upload-bold-duotone" style={{ fontSize: 56, color: '#dee2e6' }} />
                        <div className="mt-3 fw-semibold">Klikněte pro výběr souboru</div>
                        <div className="text-muted fs-12 mt-1">Podporované formáty: .csv, .xlsx, .xls — max 10 MB</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded" style={{ background: '#e8f5e9' }}>
                        <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
                        <div className="flex-grow-1">
                          <div className="fw-semibold fs-13">{importFile}</div>
                          <div className="text-muted fs-11">Nahráno · 12 KB · 18 řádků</div>
                        </div>
                        <button className="btn btn-link btn-sm text-danger p-0" onClick={() => setImportFile(null)} title="Změnit soubor">
                          <iconify-icon icon="solar:trash-bin-trash-bold-duotone" />
                        </button>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h6 className="fw-semibold mb-0 fs-13">Náhled prvních 5 řádků</h6>
                        <div className="d-flex gap-2 align-items-center">
                          <span className="text-muted fs-11">Provozovna pro celý import:</span>
                          <select className="form-select form-select-sm" style={{ width: 160, fontSize: 12 }}>
                            <option value="">Auto-rozpoznat</option>
                            <option value="cg-brno">CG Brno</option>
                            <option value="piazza">Piazza</option>
                            <option value="monte">Monte</option>
                          </select>
                        </div>
                      </div>
                      <div className="table-responsive border rounded" style={{ maxHeight: 240, overflowY: 'auto' }}>
                        <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                          <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                            <tr>
                              <th>Datum</th>
                              <th>Číslo karty/dokladu</th>
                              <th className="text-end">Částka</th>
                              <th>Provozovna</th>
                              <th>Stav</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { d: '2026-04-15', c: 'SDX-0001234', a: 1200, p: 'CG Brno',  s: 'ok' },
                              { d: '2026-04-15', c: 'SDX-0001235', a: 890,  p: 'Piazza',   s: 'ok' },
                              { d: '2026-04-16', c: 'SDX-0001236', a: 540,  p: '?',        s: 'unmatched' },
                              { d: '2026-04-16', c: 'SDX-0001237', a: 2150, p: 'Monte',    s: 'ok' },
                              { d: '2026-04-17', c: 'SDX-0001238', a: 720,  p: 'CG Brno',  s: 'ok' },
                            ].map((row, i) => (
                              <tr key={i}>
                                <td className="czk-num">{row.d}</td>
                                <td className="czk-num">{row.c}</td>
                                <td className="text-end czk-num">{row.a.toLocaleString('cs-CZ')} Kč</td>
                                <td>
                                  {row.s === 'unmatched'
                                    ? <span className="badge bg-warning-subtle text-warning fs-11">? Bez provozovny</span>
                                    : row.p}
                                </td>
                                <td>
                                  {row.s === 'ok'
                                    ? <span className="badge bg-success-subtle text-success fs-11">OK</span>
                                    : <span className="badge bg-warning-subtle text-warning fs-11">K dořešení</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="alert alert-success py-2 mb-0 mt-3 fs-12">
                        <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                        <strong>17 z 18 řádků</strong> rozpoznáno automaticky · <strong>1 řádek</strong> vyžaduje přiřazení provozovny.
                        <span className="d-block mt-1">Po potvrzení se do výpisu <strong>doplní skutečná provize</strong> a každá platba se <strong>ověří s bankou</strong> (že částka dorazila).</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-light btn-sm" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>
                    Zrušit
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={!importFile}
                    onClick={() => {
                      const cekajici = denni.filter((d) => d.stav === 'ceka-na-D1').length;
                      const neprislo = denni.filter((d) => d.stav === 'neprislo').length;
                      const overeno = denni.length - neprislo;
                      setReconciled(true);
                      setImportModalOpen(false);
                      setImportFile(null);
                      setToast(`Přehled nahrán — skutečná provize doplněna u ${cekajici} plateb · ověřeno s bankou: ${overeno}/${denni.length} dorazilo${neprislo ? ` · ${neprislo} nedorazilo` : ''}.`);
                    }}>
                    <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                    Nahrát a ověřit s bankou
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
