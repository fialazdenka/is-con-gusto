// COMPONENT: Faktury – správa a schvalování faktur
// SOURCE: Larkon-like → Page layout
// CUSTOM: NO

import { useState, useCallback } from 'react';
import type { AppState } from '../types';
import {
  getFakturyForProvozovna,
  isPoSplatnosti,
  isSplatneVObdobi,
  TYDEN_OD,
  TYDEN_DO,
  PROCESSING_DAYS_DEFAULT,
  KATEGORIE_LABELS,
} from '../platbyData';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import FakturyTable from './FakturyTable';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function FakturyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  const [periodOd,        setPeriodOd]        = useState(TYDEN_OD);
  const [periodDo,        setPeriodDo]        = useState(TYDEN_DO);
  const [kategorieFilter, setKategorieFilter] = useState('all');
  const [stavFilter,      setStavFilter]      = useState('all');
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());

  const toggleFa = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAllFa = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const allFaktury     = getFakturyForProvozovna(selectedProvozovna);
  const poSplatCnt     = allFaktury.filter(
    (f) => f.stav !== 'zaplacena' && f.stav !== 'odeslana' && isPoSplatnosti(f.splatnost)
  ).length;
  const neschvaleneCnt = allFaktury.filter(
    (f) => f.stav === 'nova' || f.stav === 'ke-schvaleni'
  ).length;
  const splatneVObdobi = allFaktury.filter(
    (f) =>
      f.stav !== 'zaplacena' &&
      f.stav !== 'odeslana' &&
      isSplatneVObdobi(f.splatnost, periodOd, periodDo) &&
      !isPoSplatnosti(f.splatnost)
  ).length;

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Faktury</h1>
          <div className="page-sub">
            Správa a schvalování faktur · {allFaktury.length} faktur celkem
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
          <button className="btn btn-secondary btn-sm">+ Nová faktura</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => update({ selectedSection: 'platby' })}
          >
            Přejít na platby →
          </button>
        </div>
      </div>

      {/* Alert strips */}
      {(poSplatCnt > 0 || neschvaleneCnt > 0 || splatneVObdobi > 0) && (
        <div style={{ marginBottom: 16 }}>
          {poSplatCnt > 0 && (
            <div className="alert-strip alert-err">
              <span className="alert-icon">⚠</span>
              <span className="alert-msg">
                <strong>{poSplatCnt} faktur po splatnosti</strong> – vyžadují okamžitou pozornost
              </span>
              <span className="alert-cta" onClick={() => setStavFilter('po-splatnosti')}>
                Zobrazit →
              </span>
            </div>
          )}
          {neschvaleneCnt > 0 && (
            <div className="alert-strip alert-warn" style={{ marginTop: poSplatCnt > 0 ? 6 : 0 }}>
              <span className="alert-icon">⏳</span>
              <span className="alert-msg">
                <strong>{neschvaleneCnt} faktur čeká na schválení</strong> – nemohou být odeslány k platbě
              </span>
              <span className="alert-cta" onClick={() => setStavFilter('neschvalena')}>
                Schválit →
              </span>
            </div>
          )}
          {splatneVObdobi > 0 && (
            <div className="alert-strip alert-info" style={{ marginTop: (poSplatCnt > 0 || neschvaleneCnt > 0) ? 6 : 0 }}>
              <span className="alert-icon">📅</span>
              <span className="alert-msg">
                <strong>{splatneVObdobi} faktur splatných v tomto týdnu</strong>
              </span>
              <span className="alert-cta" onClick={() => setStavFilter('tydni')}>
                Filtrovat →
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI strip */}
      <PlatbyKPIStrip
        provozovna={selectedProvozovna}
        periodOd={periodOd}
        periodDo={periodDo}
      />

      {/* Filter bar */}
      <div className="card section-gap">
        <div className="card-body" style={{ padding: '10px 16px' }}>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <span className="filter-label">Filtr:</span>

            <select
              className="select"
              value={kategorieFilter}
              onChange={(e) => setKategorieFilter(e.target.value)}
            >
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>

            <select
              className="select"
              value={stavFilter}
              onChange={(e) => setStavFilter(e.target.value)}
            >
              <option value="all">Všechny stavy</option>
              <option value="schvalena">Schválené</option>
              <option value="neschvalena">Neschválené</option>
              <option value="po-splatnosti">Po splatnosti</option>
              <option value="tydni">Splatné tento týden</option>
            </select>

            <div className="flex gap-2" style={{ marginLeft: 8 }}>
              {poSplatCnt > 0 && (
                <button
                  className={`badge ${stavFilter === 'po-splatnosti' ? 'badge-err' : 'badge-neutral'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setStavFilter((s) => s === 'po-splatnosti' ? 'all' : 'po-splatnosti')}
                >
                  ⚠ Po splatnosti ({poSplatCnt})
                </button>
              )}
              {neschvaleneCnt > 0 && (
                <button
                  className={`badge ${stavFilter === 'neschvalena' ? 'badge-warn' : 'badge-neutral'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setStavFilter((s) => s === 'neschvalena' ? 'all' : 'neschvalena')}
                >
                  ⏳ Ke schválení ({neschvaleneCnt})
                </button>
              )}
            </div>

            {(kategorieFilter !== 'all' || stavFilter !== 'all') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setKategorieFilter('all'); setStavFilter('all'); }}
                style={{ marginLeft: 'auto' }}
              >
                Zrušit filtry ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabulka faktur – plná šíře */}
      <FakturyTable
        provozovna={selectedProvozovna}
        periodOd={periodOd}
        periodDo={periodDo}
        kategorieFilter={kategorieFilter}
        stavFilter={stavFilter}
        selectedIds={selectedIds}
        onToggle={toggleFa}
        onToggleAll={toggleAllFa}
        processingDays={PROCESSING_DAYS_DEFAULT}
      />

      {/* Sticky akční bar pro hromadné schválení */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--sh-xl)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
          }}
        >
          <span className="fw-600 fs-sm">{selectedIds.size} faktur vybráno</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Zrušit výběr
          </button>
          <button
            className="btn btn-sm"
            style={{ background: '#16a34a', color: 'white', borderColor: '#16a34a' }}
            onClick={() => setSelectedIds(new Set())}
          >
            ✓ Schválit vybrané ({selectedIds.size})
          </button>
        </div>
      )}
    </>
  );
}
