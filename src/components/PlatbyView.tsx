// COMPONENT: Platby – operační finance dashboard
// SOURCE: Larkon _page-title.scss + Bootstrap layout
// CUSTOM: PARTIAL – sync bar, smart alerts, bulk toolbar, detail panel

import { useState, useCallback } from 'react';
import type { AppState } from '../types';
import type { FutureRevMode, FakturaStavPlatby } from '../platbyData';
import {
  FAKTURY_PLATBY, OSTATNI_PLATBY,
  getFakturyForProvozovna, getZustatek, getCekajiciKarty, getOdhadZbytek,
  isPoSplatnosti,
  TYDEN_DO, PROCESSING_DAYS_DEFAULT, BANKOVNI_UCTY,
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

  const periodOd = '2020-01-01'; // Od vždy od počátku – nic neutece
  const [periodDo, setPeriodDo] = useState(TYDEN_DO);
  const [stavFilter, setStavFilter] = useState<'schvalena' | 'neschvalena'>('schvalena');
  const [selectedFaIds,  setSelectedFaIds]  = useState<Set<string>>(new Set());
  // Vybrané platební účty – default: jen aktuálně vybraná provozovna (nebo první 3)
  const [selectedUctyIds, setSelectedUctyIds] = useState<Set<string>>(() =>
    selectedProvozovna === 'all'
      ? new Set(BANKOVNI_UCTY.map((u) => u.provozovna))
      : new Set([selectedProvozovna])
  );
  const toggleUcet = (provId: string) => setSelectedUctyIds((prev) => {
    const n = new Set(prev);
    if (n.has(provId) && n.size > 1) n.delete(provId); // min. 1 účet vždy
    else n.add(provId);
    return n;
  });
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

  const pocetVybrano = selectedFaIds.size + selectedOstIds.size;

  const detailFaktura = detailId
    ? FAKTURY_PLATBY.find((f) => f.id === detailId)
    : null;

  // For detail panel, show effective state from localStavy
  const detailFakturaEffective = detailFaktura
    ? { ...detailFaktura, stav: (localStavy[detailFaktura.id] ?? detailFaktura.stav) as FakturaStavPlatby }
    : null;

  return (
    <>
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
                <strong>{chybaPlatby.length === 1 ? 'Platba neproběhla' : `${chybaPlatby.length}× Platba neproběhla`}</strong>
                {' '}– nutná okamžitá akce
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
              <span className="text-muted fs-13">Splatné do:</span>
              <input type="date" className="form-control form-control-sm" value={periodDo}
                onChange={(e) => setPeriodDo(e.target.value)} style={{ width: 140 }} />
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={stavFilter}
              onChange={(e) => {
                setStavFilter(e.target.value as typeof stavFilter);
                setSelectedFaIds(new Set()); // reset výběru při změně filtru
              }}
            >
              <option value="schvalena">Schválená</option>
              <option value="neschvalena">Nová / neschválená</option>
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
            stavFilter={stavFilter}
            typDokladu="all"
            showExtraCols={false}
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
            selectedUctyIds={selectedUctyIds}
            onToggleUcet={toggleUcet}
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
