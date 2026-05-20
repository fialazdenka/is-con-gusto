import { useState } from 'react';
import type { MatchingRecord } from '../platbyData';
import type { FakturaPlatby } from '../platbyData';
import { getDodaciListy } from '../dodaciListyData';
import {
  generateFakturaPolozky,
  getDiffStav,
  DIFF_META,
} from '../fakturaPolozkyUtils';
import { fCzk } from '../data';

interface Props {
  faktura: FakturaPlatby;
  matching: MatchingRecord;
  onDlCislaChange?: (cisla: string[]) => void;
  onRematch?: (id: string) => void;
}

// ── Tolerance legend ──────────────────────────────────────────

function LegendaDot({ stav, label }: { stav: 'ok' | 'tolerance' | 'problem'; label: string }) {
  const meta = DIFF_META[stav];
  return (
    <span className="d-flex align-items-center gap-1 fs-11" style={{ color: meta.color }}>
      <iconify-icon icon={meta.icon} style={{ fontSize: 13 }} />
      {label}
    </span>
  );
}

export default function DLMatchingDetail({ faktura, matching, onDlCislaChange, onRematch }: Props) {
  const [editMode,    setEditMode]    = useState(false);
  const [newDlInput,  setNewDlInput]  = useState('');
  const [localDlCisla, setLocalDlCisla] = useState<string[]>(matching.dlCisla ?? []);
  const [rematch,     setRematch]     = useState(false);

  const dlList   = getDodaciListy(localDlCisla);
  const dlCelkem = dlList.reduce((s, dl) => s + dl.celkemSDph, 0);
  const totalDiff = faktura.castka - dlCelkem;
  const totalSedi = Math.abs(totalDiff) <= 1;

  function handleAddDL() {
    const val = newDlInput.trim().toUpperCase();
    if (!val || localDlCisla.includes(val)) return;
    const updated = [...localDlCisla, val];
    setLocalDlCisla(updated);
    onDlCislaChange?.(updated);
    setNewDlInput('');
  }
  function handleRemoveDL(cislo: string) {
    const updated = localDlCisla.filter((c) => c !== cislo);
    setLocalDlCisla(updated);
    onDlCislaChange?.(updated);
  }
  function handleRematch() {
    setRematch(true);
    onRematch?.(faktura.id);
    setTimeout(() => setRematch(false), 1800);
  }

  // Generuj položky faktury pro porovnání
  const fakturaPolozky = generateFakturaPolozky(faktura.castka, faktura.kategorie);

  // Postav diff řádky: spáruj položky DL s položkami faktury podle názvu
  const allDlPolozky = dlList.flatMap((dl) => dl.polozky);
  type DiffRow = {
    popis: string;
    fakturaTotal: number | null;
    dlTotal: number | null;
  };

  const diffRows: DiffRow[] = [];
  const matchedDlNames = new Set<string>();

  fakturaPolozky.forEach((fp) => {
    const dlMatch = allDlPolozky.find(
      (dp) => dp.popis.toLowerCase() === fp.popis.toLowerCase() && !matchedDlNames.has(dp.popis)
    );
    if (dlMatch) matchedDlNames.add(dlMatch.popis);
    diffRows.push({
      popis: fp.popis,
      fakturaTotal: fp.total,
      dlTotal: dlMatch ? dlMatch.celkemSDph : null,
    });
  });

  // Položky v DL které nebyly spárovány → extra
  allDlPolozky
    .filter((dp) => !matchedDlNames.has(dp.popis))
    .forEach((dp) => {
      diffRows.push({ popis: dp.popis, fakturaTotal: null, dlTotal: dp.celkemSDph });
    });

  const okCnt        = diffRows.filter((r) => getDiffStav(r.fakturaTotal, r.dlTotal) === 'ok').length;
  const toleranceCnt = diffRows.filter((r) => getDiffStav(r.fakturaTotal, r.dlTotal) === 'tolerance').length;
  const problemCnt   = diffRows.filter((r) => {
    const s = getDiffStav(r.fakturaTotal, r.dlTotal);
    return s === 'problem' || s === 'chybi-dl' || s === 'chybi-faktura';
  }).length;

  return (
    <div>
      {/* ── DL čísla ─────────────────────────────────────── */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="text-muted fs-11 text-uppercase fw-semibold">Dodací listy</span>
          <button className="btn btn-link btn-sm p-0 fs-11 text-muted text-decoration-none"
            onClick={() => setEditMode((v) => !v)}>
            {editMode ? 'Hotovo' : 'Upravit DL'}
          </button>
        </div>
        <div className="d-flex flex-column gap-1 mb-2">
          {localDlCisla.length === 0 && (
            <div className="text-muted fs-12 fst-italic">Žádné DL přiřazeno</div>
          )}
          {localDlCisla.map((dl) => (
            <div key={dl} className="d-flex align-items-center gap-2">
              <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 14, color: '#9097a7' }} />
              <span className="fs-12 czk-num flex-grow-1">{dl}</span>
              {getDodaciListy([dl]).length === 0 && (
                <span className="badge bg-secondary-subtle text-secondary fs-10">nenalezeno v systému</span>
              )}
              {editMode && (
                <button className="btn btn-link btn-sm p-0 text-danger" style={{ fontSize: 11 }}
                  onClick={() => handleRemoveDL(dl)}>
                  <iconify-icon icon="solar:close-circle-bold-duotone" />
                </button>
              )}
            </div>
          ))}
        </div>
        {editMode && (
          <div className="d-flex gap-2">
            <input type="text" className="form-control form-control-sm czk-num"
              placeholder="DL-2026-XXXX"
              value={newDlInput}
              onChange={(e) => setNewDlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDL()}
              style={{ fontSize: 12 }} />
            <button className="btn btn-light btn-sm flex-shrink-0" onClick={handleAddDL}>
              <iconify-icon icon="solar:add-circle-bold" />
            </button>
          </div>
        )}
      </div>

      {/* ── Celkový součet ──────────────────────────────── */}
      {dlList.length > 0 && (
        <div className="p-2 rounded mb-3"
          style={{ background: totalSedi ? '#f0fdf4' : '#fff5f5', border: `1px solid ${totalSedi ? '#bbf7d0' : '#fecaca'}` }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon
              icon={totalSedi ? 'solar:check-circle-bold-duotone' : 'solar:danger-circle-bold-duotone'}
              style={{ fontSize: 16, color: totalSedi ? '#198754' : '#dc3545' }} />
            <span className="fs-12 fw-bold" style={{ color: totalSedi ? '#198754' : '#dc3545' }}>
              {totalSedi ? 'Celkové částky sedí' : `Rozdíl celkem: ${totalDiff > 0 ? '+' : '−'}${fCzk(Math.abs(totalDiff))}`}
            </span>
          </div>
          <div className="d-flex gap-3" style={{ fontSize: 11 }}>
            <div>
              <div className="text-muted">Faktura</div>
              <div className="fw-bold czk-num">{fCzk(faktura.castka)}</div>
            </div>
            <div style={{ color: '#dee2e6', alignSelf: 'center', fontSize: 16 }}>vs</div>
            <div>
              <div className="text-muted">DL celkem{dlList.length > 1 ? ` (${dlList.length}×)` : ''}</div>
              <div className="fw-bold czk-num">{fCzk(dlCelkem)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Diff tabulka položek ─────────────────────────── */}
      {dlList.length > 0 && (
        <div className="mb-3">
          {/* Summary bar */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="text-muted fs-11 text-uppercase fw-semibold">Porovnání položek</span>
            <div className="d-flex gap-3">
              {okCnt > 0        && <LegendaDot stav="ok"        label={`${okCnt} sedí`} />}
              {toleranceCnt > 0 && <LegendaDot stav="tolerance" label={`${toleranceCnt} tolerance`} />}
              {problemCnt > 0   && <LegendaDot stav="problem"   label={`${problemCnt} problém`} />}
            </div>
          </div>

          <div style={{ border: '1px solid #e9ecef', borderRadius: 6, overflow: 'hidden', fontSize: 11 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '5px 8px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <div>Položka</div>
              <div style={{ textAlign: 'right' }}>Faktura</div>
              <div style={{ textAlign: 'right' }}>DL</div>
              <div style={{ textAlign: 'right' }}>Rozdíl</div>
            </div>

            {/* Rows */}
            {diffRows.map((row, i) => {
              const stav  = getDiffStav(row.fakturaTotal, row.dlTotal);
              const meta  = DIFF_META[stav];
              const diff  = (row.fakturaTotal ?? 0) - (row.dlTotal ?? 0);
              const isLast = i === diffRows.length - 1;

              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 90px 80px',
                    padding: '6px 8px',
                    borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                    background: stav === 'ok' ? 'transparent' : meta.bg,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <iconify-icon
                      icon={meta.icon}
                      style={{ fontSize: 13, color: meta.color, flexShrink: 0 }}
                    />
                    <span style={{ color: stav === 'ok' ? '#1a1a1a' : meta.color }}>{row.popis}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6c757d' }}>
                    {row.fakturaTotal != null ? fCzk(row.fakturaTotal) : <span style={{ color: '#9097a7' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6c757d' }}>
                    {row.dlTotal != null ? fCzk(row.dlTotal) : <span style={{ color: '#9097a7' }}>—</span>}
                  </div>
                  <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: meta.color }}>
                    {stav === 'ok'
                      ? <span style={{ color: '#198754' }}>✓</span>
                      : stav === 'chybi-dl'
                        ? <span style={{ fontSize: 10 }}>Chybí</span>
                        : stav === 'chybi-faktura'
                          ? <span style={{ fontSize: 10 }}>Navíc</span>
                          : `${diff > 0 ? '+' : '−'}${fCzk(Math.abs(diff))}`
                    }
                  </div>
                </div>
              );
            })}

            {/* Celkový řádek */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 90px 80px',
              padding: '6px 8px',
              background: '#f8f9fa',
              borderTop: '2px solid #dee2e6',
              fontWeight: 700,
              fontSize: 12,
            }}>
              <div>Celkem</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(faktura.castka)}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(dlCelkem)}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: totalSedi ? '#198754' : '#dc3545' }}>
                {totalSedi ? '✓' : `${totalDiff > 0 ? '+' : '−'}${fCzk(Math.abs(totalDiff))}`}
              </div>
            </div>
          </div>

          {/* Legenda tolerance */}
          <div className="d-flex gap-4 mt-2" style={{ fontSize: 10, color: '#9097a7' }}>
            <span>Zelená = přesná shoda (≤ 1 Kč)</span>
            <span>Oranžová = tolerance (≤ 5 %)</span>
            <span>Červená = problém (&gt; 5 %)</span>
          </div>
        </div>
      )}

      {/* ── Akce ─────────────────────────────────────────── */}
      <div className="d-flex gap-2">
        <button className="btn btn-light btn-sm flex-grow-1" onClick={handleRematch}
          disabled={rematch} style={{ fontSize: 12 }}>
          <iconify-icon icon="solar:refresh-bold-duotone"
            className={`me-1${rematch ? ' spin' : ''}`} style={{ fontSize: 13 }} />
          {rematch ? 'Párování probíhá…' : 'Spustit párování'}
        </button>
        {!totalSedi && dlList.length > 0 && (
          <button className="btn btn-light btn-sm flex-grow-1"
            style={{ fontSize: 12 }} onClick={() => setEditMode(true)}>
            <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1" style={{ fontSize: 13 }} />
            Přidat DL
          </button>
        )}
      </div>
    </div>
  );
}
