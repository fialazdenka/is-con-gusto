// COMPONENT: Platby – operační finance dashboard
// SOURCE: Larkon _page-title.scss + Bootstrap layout
// CUSTOM: PARTIAL – sync bar, smart alerts, bulk toolbar, detail panel

import { useState, useCallback } from 'react';
import type { AppState } from '../types';
import type { FutureRevMode, FakturaStavPlatby } from '../platbyData';
import {
  FAKTURY_PLATBY, OSTATNI_PLATBY,
  getFakturyForProvozovna, getZustatek, getCekajiciKarty, getOdhadZbytek,
  isPoSplatnosti, getBankSync, getBankovniUcet,
  TYDEN_OD, TYDEN_DO, PROCESSING_DAYS_DEFAULT, KATEGORIE_LABELS,
} from '../platbyData';
import FakturyTable from './FakturyTable';
import DalsiPlatbyPanel from './DalsiPlatbyPanel';
import BalancePanel from './BalancePanel';
import PotvrditModal from './PotvrditModal';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import PlatbyDetailPanel from './PlatbyDetailPanel';
import { fCzk } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

type Potvrzeni = 'idle' | 'confirm' | 'sent';

// Local state updates for panel actions (wireframe only — in prod this would be API calls)
type LocalStavy = Record<string, FakturaStavPlatby>;

export default function PlatbyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  void PROCESSING_DAYS_DEFAULT;

  const [periodOd,       setPeriodOd]       = useState(TYDEN_OD);
  const [periodDo,       setPeriodDo]       = useState(TYDEN_DO);
  const [selectedFaIds,  setSelectedFaIds]  = useState<Set<string>>(new Set());
  const [selectedOstIds, setSelectedOstIds] = useState<Set<string>>(new Set());
  const [futureRevMode,  setFutureRevMode]  = useState<FutureRevMode>('off');
  const [potvrzeni,      setPotvrzeni]      = useState<Potvrzeni>('idle');
  const [detailId,       setDetailId]       = useState<string | null>(null);
  const [localStavy,     setLocalStavy]     = useState<LocalStavy>({});

  const toggleFa = useCallback((id: string) => {
    setSelectedFaIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const toggleAllFa = useCallback((ids: string[]) => { setSelectedFaIds(new Set(ids)); }, []);
  const toggleOst = useCallback((id: string) => {
    setSelectedOstIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const zustatek = getZustatek(selectedProvozovna);
  const sumaFa   = FAKTURY_PLATBY
    .filter((f) => selectedFaIds.has(f.id) && (selectedProvozovna === 'all' || f.provozovna === selectedProvozovna))
    .reduce((s, f) => s + f.castka, 0);
  const sumaOst  = OSTATNI_PLATBY
    .filter((o) => selectedOstIds.has(o.id) && (selectedProvozovna === 'all' || o.provozovna === selectedProvozovna))
    .reduce((s, o) => s + o.castka, 0);
  const karty    = futureRevMode !== 'off' ? getCekajiciKarty(selectedProvozovna) : 0;
  const odhad    = futureRevMode === 'budouci-plus' ? getOdhadZbytek(selectedProvozovna) : 0;
  const vysledek = zustatek - sumaFa - sumaOst + karty + odhad;

  function handleConfirm() {
    setSelectedFaIds(new Set());
    setSelectedOstIds(new Set());
    setPotvrzeni('sent');
  }

  // Smart alert logic: distinguish overdue-unpaid vs overdue-but-in-bank
  const vsechnyFaktury = getFakturyForProvozovna(selectedProvozovna);
  const overdueUnpaid  = vsechnyFaktury.filter(
    (f) => isPoSplatnosti(f.splatnost)
      && f.stav !== 'zaplacena' && f.stav !== 'odeslana'
      && f.stav !== 'v-bance' && f.stav !== 'ceka-na-sparovani' && f.stav !== 'chyba-platby'
  );
  const overdueInBank  = vsechnyFaktury.filter(
    (f) => isPoSplatnosti(f.splatnost)
      && (f.stav === 'v-bance' || f.stav === 'ceka-na-sparovani')
  );
  const chybaPlatby    = vsechnyFaktury.filter((f) => (localStavy[f.id] ?? f.stav) === 'chyba-platby');
  const neschvalene    = vsechnyFaktury.filter((f) => f.stav === 'nova' || f.stav === 'ke-schvaleni');

  const sync = getBankSync(selectedProvozovna);
  const ucet = selectedProvozovna !== 'all' ? getBankovniUcet(selectedProvozovna) : undefined;
  const pocetVybrano = selectedFaIds.size + selectedOstIds.size;

  const detailFaktura = detailId
    ? FAKTURY_PLATBY.find((f) => f.id === detailId)
    : null;

  // For detail panel, show effective state from localStavy
  const detailFakturaEffective = detailFaktura
    ? { ...detailFaktura, stav: (localStavy[detailFaktura.id] ?? detailFaktura.stav) as FakturaStavPlatby }
    : null;

  function syncLabel(dt: string) {
    if (!dt) return 'Nikdy';
    const t = new Date(dt);
    const now = new Date('2026-04-17T15:00:00');
    const diffMin = Math.round((now.getTime() - t.getTime()) / 60000);
    if (diffMin < 1) return 'Právě teď';
    if (diffMin < 60) return `Před ${diffMin} min`;
    return `Před ${Math.round(diffMin / 60)} hod`;
  }

  return (
    <>
      {/* ── Bank sync status bar ─────────────────────────────── */}
      <div className="platby-sync-bar mb-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <span className={`platby-sync-dot platby-sync-dot--${sync.stav}`} />
            <span className="fs-12 fw-semibold">
              {sync.stav === 'ok'    && 'Bankovní spojení OK'}
              {sync.stav === 'ceka'  && (sync.zprava ?? 'Synchronizace probíhá…')}
              {sync.stav === 'chyba' && 'Bankovní API nedostupné'}
            </span>
          </div>
          {sync.posledniSync && (
            <span className="text-muted fs-12">
              Aktualizováno: {syncLabel(sync.posledniSync)}
            </span>
          )}
          {ucet && (
            <span className="text-muted fs-12 ms-auto font-monospace">
              {ucet.nazev} · {ucet.cisloUctu}
            </span>
          )}
          {selectedProvozovna === 'all' && (
            <span className="badge bg-warning-subtle text-warning ms-auto fs-11">
              Hromadný export plateb není dostupný – vyberte konkrétní provozovnu
            </span>
          )}
        </div>
      </div>

      {/* ── Success alert ────────────────────────────────────── */}
      {potvrzeni === 'sent' && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
          <iconify-icon icon="solar:check-circle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1 fw-semibold">
            Platby odeslány do banky. Faktury přešly do stavu „V bance".
          </span>
          <button type="button" className="btn-close ms-auto" onClick={() => setPotvrzeni('idle')} />
        </div>
      )}

      {/* ── Smart alerts ─────────────────────────────────────── */}
      {(chybaPlatby.length > 0 || overdueUnpaid.length > 0 || overdueInBank.length > 0 || neschvalene.length > 0) && (
        <div className="d-flex flex-column gap-2 mb-3">
          {chybaPlatby.length > 0 && (
            <div className="alert platby-alert-chyba d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-circle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{chybaPlatby.length} {chybaPlatby.length === 1 ? 'platba selhala' : 'platby selhaly'}</strong>
                {' '}– platby vráceny bankou, nutná okamžitá akce
              </span>
              <button className="btn btn-sm btn-danger text-nowrap" onClick={() => setDetailId(chybaPlatby[0].id)}>
                Zobrazit →
              </button>
            </div>
          )}
          {overdueUnpaid.length > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{overdueUnpaid.length} faktur po splatnosti</strong> – nezaplaceno, nutná okamžitá akce
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }}
                onClick={() => update({ selectedSection: 'faktury' })}>
                Správa faktur →
              </span>
            </div>
          )}
          {overdueInBank.length > 0 && (
            <div className="alert alert-info d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:bank-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{overdueInBank.length} faktur po splatnosti – již odeslány do banky</strong>
                {' '}· čeká se na spárování
              </span>
            </div>
          )}
          {neschvalene.length > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:clock-circle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{neschvalene.length} faktur čeká na schválení</strong> – nelze je vybrat k platbě
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }}
                onClick={() => update({ selectedSection: 'faktury' })}>
                Schválit →
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Strip ────────────────────────────────────────── */}
      <PlatbyKPIStrip provozovna={selectedProvozovna} periodOd={periodOd} periodDo={periodDo} />

      {/* ── Filter bar ───────────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted fs-13">Období:</span>
              <input type="date" className="form-control form-control-sm" value={periodOd}
                onChange={(e) => setPeriodOd(e.target.value)} style={{ width: 140 }} />
              <span className="text-muted">–</span>
              <input type="date" className="form-control form-control-sm" value={periodDo}
                onChange={(e) => setPeriodDo(e.target.value)} style={{ width: 140 }} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 'auto' }} defaultValue="all">
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>
            <button className="btn btn-light btn-sm ms-auto" onClick={() => update({ selectedSection: 'faktury' })}>
              ← Správa faktur
            </button>
          </div>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <FakturyTable
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            kategorieFilter="all"
            stavFilter="platby-aktivni"
            typDokladu="all"
            selectedIds={selectedFaIds}
            onToggle={toggleFa}
            onToggleAll={toggleAllFa}
            processingDays={PROCESSING_DAYS_DEFAULT}
            localStavy={localStavy}
            onRowClick={(id) => setDetailId(id)}
          />
          <DalsiPlatbyPanel
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            selectedIds={selectedOstIds}
            onToggle={toggleOst}
          />
        </div>
        <div className="col-lg-4">
          <BalancePanel
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            selectedFaIds={selectedFaIds}
            selectedOstatniIds={selectedOstIds}
            futureRevMode={futureRevMode}
            onFutureRevChange={setFutureRevMode}
            onPotvrdit={() => setPotvrzeni('confirm')}
          />
        </div>
      </div>

      {/* ── Floating bulk action toolbar ─────────────────────── */}
      {pocetVybrano > 0 && (
        <div className="platby-bulk-toolbar">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-semibold">
              {pocetVybrano} položek vybráno
              {' '}· <span className="font-monospace">{fCzk(sumaFa + sumaOst)}</span>
            </span>
            <div className="d-flex gap-2 ms-auto">
              <button className="btn btn-light btn-sm" onClick={() => { setSelectedFaIds(new Set()); setSelectedOstIds(new Set()); }}>
                Zrušit výběr
              </button>
              <button
                className={`btn btn-sm ${selectedProvozovna === 'all' ? 'btn-secondary' : 'btn-primary'}`}
                disabled={selectedProvozovna === 'all'}
                onClick={() => setPotvrzeni('confirm')}
                title={selectedProvozovna === 'all' ? 'Vyberte konkrétní provozovnu' : undefined}
              >
                <iconify-icon icon="solar:arrow-right-up-bold" className="me-1" />
                Odeslat do banky
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail panel ─────────────────────────────────────── */}
      {detailId && detailFakturaEffective && (
        <PlatbyDetailPanel
          faktura={detailFakturaEffective}
          onClose={() => setDetailId(null)}
          onOdeslatDoBanky={(id) => {
            setLocalStavy((prev) => ({ ...prev, [id]: 'v-bance' }));
            setDetailId(null);
          }}
          onPozastavit={(id) => {
            setLocalStavy((prev) => ({ ...prev, [id]: 'zastavena' }));
            setDetailId(null);
          }}
          onObnovit={(id) => {
            setLocalStavy((prev) => ({ ...prev, [id]: 'schvalena' }));
            setDetailId(null);
          }}
        />
      )}

      {/* ── Confirm modal ────────────────────────────────────── */}
      {potvrzeni === 'confirm' && (
        <PotvrditModal
          provozovna={selectedProvozovna}
          selectedFaIds={selectedFaIds}
          selectedOstatniIds={selectedOstIds}
          futureRevMode={futureRevMode}
          vysledekBalance={vysledek}
          onConfirm={handleConfirm}
          onClose={() => setPotvrzeni('idle')}
        />
      )}
    </>
  );
}
