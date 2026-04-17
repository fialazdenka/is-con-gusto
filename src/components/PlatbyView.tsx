// COMPONENT: Platby – výběr a odeslání plateb do banky
// SOURCE: Larkon-like → Page layout
// CUSTOM: NO

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

  const [periodOd,      setPeriodOd]      = useState(TYDEN_OD);
  const [periodDo,      setPeriodDo]      = useState(TYDEN_DO);
  const [selectedFaIds, setSelectedFaIds] = useState<Set<string>>(new Set());
  const [selectedOstIds,setSelectedOstIds]= useState<Set<string>>(new Set());
  const [futureRevMode, setFutureRevMode] = useState<FutureRevMode>('off');
  const [potvrzeni,     setPotvrzeni]     = useState<Potvrzeni>('idle');

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

  // Balance výpočet pro modal
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

  // Upozornění na neschválené (které nejdou vybrat)
  const neschvalene = getFakturyForProvozovna(selectedProvozovna).filter(
    (f) => f.stav === 'nova' || f.stav === 'ke-schvaleni'
  ).length;
  const poSplatCnt = getFakturyForProvozovna(selectedProvozovna).filter(
    (f) => f.stav !== 'zaplacena' && f.stav !== 'odeslana' && isPoSplatnosti(f.splatnost)
  ).length;

  return (
    <>
      {/* Stav: odesláno */}
      {potvrzeni === 'sent' && (
        <div className="alert-strip alert-info" style={{ marginBottom: 16 }}>
          <span className="alert-icon">✓</span>
          <span className="alert-msg fw-600">
            Platby byly úspěšně odeslány do banky. Faktury jsou označeny jako „Odesláno k úhradě".
          </span>
          <button className="alert-cta" onClick={() => setPotvrzeni('idle')}>Zavřít</button>
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platby</h1>
          <div className="page-sub">
            Výběr a odeslání plateb do banky · správa cashflow
          </div>
        </div>
        <div className="page-actions">
          <div className="flex items-center gap-2">
            <span className="fs-sm c-2">Období:</span>
            <input
              type="date"
              className="select"
              value={periodOd}
              onChange={(e) => setPeriodOd(e.target.value)}
              style={{ width: 140 }}
            />
            <span className="c-2">–</span>
            <input
              type="date"
              className="select"
              value={periodDo}
              onChange={(e) => setPeriodDo(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => update({ selectedSection: 'faktury' })}
          >
            ← Správa faktur
          </button>
        </div>
      </div>

      {/* Upozornění – redirect do Faktur */}
      {(poSplatCnt > 0 || neschvalene > 0) && (
        <div style={{ marginBottom: 16 }}>
          {poSplatCnt > 0 && (
            <div className="alert-strip alert-err">
              <span className="alert-icon">⚠</span>
              <span className="alert-msg">
                <strong>{poSplatCnt} faktur po splatnosti</strong>
              </span>
              <span
                className="alert-cta"
                onClick={() => update({ selectedSection: 'faktury' })}
              >
                Správa faktur →
              </span>
            </div>
          )}
          {neschvalene > 0 && (
            <div className="alert-strip alert-warn" style={{ marginTop: poSplatCnt > 0 ? 6 : 0 }}>
              <span className="alert-icon">⏳</span>
              <span className="alert-msg">
                <strong>{neschvalene} faktur čeká na schválení</strong> – nelze je vybrat k platbě
              </span>
              <span
                className="alert-cta"
                onClick={() => update({ selectedSection: 'faktury' })}
              >
                Schválit →
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter bar – pouze kategorie, schválené jsou zobrazeny automaticky */}
      <div className="card section-gap">
        <div className="card-body" style={{ padding: '10px 16px' }}>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <span className="filter-label">Kategorie:</span>
            <select
              className="select"
              defaultValue="all"
            >
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>
            <span
              className="badge badge-ok"
              style={{ marginLeft: 8 }}
            >
              Zobrazeny pouze schválené faktury
            </span>
          </div>
        </div>
      </div>

      {/* Hlavní layout: tabulka + balance panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Levý sloupec */}
        <div>
          <FakturyTable
            provozovna={selectedProvozovna}
            periodOd={periodOd}
            periodDo={periodDo}
            kategorieFilter="all"
            stavFilter="schvalena"
            selectedIds={selectedFaIds}
            onToggle={toggleFa}
            onToggleAll={toggleAllFa}
            processingDays={PROCESSING_DAYS_DEFAULT}
          />

          <div style={{ marginTop: 16 }}>
            <DalsiPlatbyPanel
              provozovna={selectedProvozovna}
              periodOd={periodOd}
              periodDo={periodDo}
              selectedIds={selectedOstIds}
              onToggle={toggleOst}
            />
          </div>
        </div>

        {/* Pravý sloupec: balance calculator (sticky) */}
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
