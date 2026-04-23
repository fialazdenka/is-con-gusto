// COMPONENT: Platby – výběr a odeslání plateb do banky
// SOURCE: Larkon _page-title.scss + Bootstrap layout + _alert.scss
// CUSTOM: PARTIAL – layout Larkon, logika custom
//   – zobrazuje pouze schválené faktury (stavFilter = "schvalena" fixed)
//   – navigace zpět na FakturyView přes update({ selectedSection: "faktury" })
//   – BalancePanel: custom kalkulátor s FutureRevMode (gastro logika)
//   – PotvrditModal: double-confirm při nedostatku prostředků
//   – DalsiPlatbyPanel: ostatní platby (trvalé příkazy, splátky, výplaty)
//
// Larkon class mapping:
//   .page-title-box                       → page header row
//   .alert.alert-{success|danger|warning} → stavové hlášení po odeslání
//   .alert-link                           → CTA v alertu
//   .card > .card-body                    → filter panel
//   .form-control.form-control-sm         → date pickers (od / do)
//   .form-select.form-select-sm           → kategorie select
//   .row.g-4                              → hlavní layout (tabulka 8 + balance 4 sloupce)
//   CUSTOM: BalancePanel                  → sticky cashflow kalkulátor (gastro doménová logika)
//   CUSTOM: PotvrditModal                 → potvrzovací modal s dvojím potvrzením
//   CUSTOM: DalsiPlatbyPanel              → ostatní platby mimo fakturační cyklus

import { useState, useCallback } from 'react';
import type { AppState } from '../types';
import type { FutureRevMode } from '../platbyData';
import {
  FAKTURY_PLATBY,
  OSTATNI_PLATBY,
  getFakturyForProvozovna,
  getZustatek,
  getCekajiciKarty,
  getOdhadZbytek,
  isPoSplatnosti,
  TYDEN_OD,
  TYDEN_DO,
  PROCESSING_DAYS_DEFAULT,
  KATEGORIE_LABELS,
} from '../platbyData';
import FakturyTable from './FakturyTable';
import DalsiPlatbyPanel from './DalsiPlatbyPanel';
import BalancePanel from './BalancePanel';
import PotvrditModal from './PotvrditModal';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

type Potvrzeni = 'idle' | 'confirm' | 'sent';

export default function PlatbyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  const [periodOd,       setPeriodOd]       = useState(TYDEN_OD);
  const [periodDo,       setPeriodDo]       = useState(TYDEN_DO);
  const [selectedFaIds,  setSelectedFaIds]  = useState<Set<string>>(new Set());
  const [selectedOstIds, setSelectedOstIds] = useState<Set<string>>(new Set());
  const [futureRevMode,  setFutureRevMode]  = useState<FutureRevMode>('off');
  const [potvrzeni,      setPotvrzeni]      = useState<Potvrzeni>('idle');

  const toggleFa = useCallback((id: string) => {
    setSelectedFaIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAllFa = useCallback((ids: string[]) => {
    setSelectedFaIds(new Set(ids));
  }, []);

  const toggleOst = useCallback((id: string) => {
    setSelectedOstIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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

  const neschvalene = getFakturyForProvozovna(selectedProvozovna).filter(
    (f) => f.stav === 'nova' || f.stav === 'ke-schvaleni'
  ).length;
  const poSplatCnt = getFakturyForProvozovna(selectedProvozovna).filter(
    (f) => f.stav !== 'zaplacena' && f.stav !== 'odeslana' && isPoSplatnosti(f.splatnost)
  ).length;

  void PROCESSING_DAYS_DEFAULT;

  return (
    <>
      {/* Stav: odesláno – SOURCE: Bootstrap .alert.alert-success */}
      {potvrzeni === 'sent' && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-4">
          <iconify-icon icon="solar:check-circle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1 fw-semibold">
            Platby byly úspěšně odeslány do banky. Faktury jsou označeny jako „Odesláno k úhradě".
          </span>
          <button type="button" className="btn-close ms-auto" onClick={() => setPotvrzeni('idle')} />
        </div>
      )}

      {/* SOURCE: Larkon .page-title-box */}
      <div className="page-title-box">
        <div>
          <h4 className="page-title fw-semibold mb-1">Platby</h4>
          <p className="text-muted mb-0">Výběr a odeslání plateb do banky · správa cashflow</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted fs-13">Období:</span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={periodOd}
              onChange={(e) => setPeriodOd(e.target.value)}
              style={{ width: 140 }}
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={periodDo}
              onChange={(e) => setPeriodDo(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
          <button
            className="btn btn-light btn-sm"
            onClick={() => update({ selectedSection: 'faktury' })}
          >
            ← Správa faktur
          </button>
        </div>
      </div>

      {/* Upozornění – SOURCE: Bootstrap .alert.alert-{danger|warning} */}
      {(poSplatCnt > 0 || neschvalene > 0) && (
        <div className="d-flex flex-column gap-2 mb-4">
          {poSplatCnt > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{poSplatCnt} faktur po splatnosti</strong>
              </span>
              <span
                className="alert-link fw-semibold text-nowrap ms-auto"
                style={{ cursor: 'pointer' }}
                onClick={() => update({ selectedSection: 'faktury' })}
              >
                Správa faktur →
              </span>
            </div>
          )}
          {neschvalene > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:clock-circle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{neschvalene} faktur čeká na schválení</strong> – nelze je vybrat k platbě
              </span>
              <span
                className="alert-link fw-semibold text-nowrap ms-auto"
                style={{ cursor: 'pointer' }}
                onClick={() => update({ selectedSection: 'faktury' })}
              >
                Schválit →
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter bar – SOURCE: Larkon .card > .card-body */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted fs-13">Kategorie:</span>
            {/* SOURCE: Bootstrap .form-select.form-select-sm */}
            <select className="form-select form-select-sm" style={{ width: 'auto' }} defaultValue="all">
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>
            {/* SOURCE: Larkon .badge.bg-success-subtle.text-success */}
            <span className="badge bg-success-subtle text-success ms-2">
              Zobrazeny pouze schválené faktury
            </span>
          </div>
        </div>
      </div>

      {/* Hlavní layout – SOURCE: Bootstrap .row.g-4 */}
      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <FakturyTable
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            kategorieFilter="all"
            stavFilter="schvalena"
            typDokladu="all"
            selectedIds={selectedFaIds}
            onToggle={toggleFa}
            onToggleAll={toggleAllFa}
            processingDays={PROCESSING_DAYS_DEFAULT}
          />

          <DalsiPlatbyPanel
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            selectedIds={selectedOstIds}
            onToggle={toggleOst}
          />
        </div>

        {/* Balance panel – sticky pravý sloupec */}
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

      {/* Potvrzovací modal */}
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
