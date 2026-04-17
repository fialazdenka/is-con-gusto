// COMPONENT: Potvrzení platby – Modal dialog
// SOURCE: Larkon-like → Modal (Bootstrap)
// CUSTOM: NO

import { FAKTURY_PLATBY, OSTATNI_PLATBY, getZustatek } from '../platbyData';
import type { FutureRevMode } from '../platbyData';
import type { ProvozovnaId } from '../types';
import { fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  selectedFaIds: Set<string>;
  selectedOstatniIds: Set<string>;
  futureRevMode: FutureRevMode;
  vysledekBalance: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PotvrditModal({
  provozovna,
  selectedFaIds,
  selectedOstatniIds,
  vysledekBalance,
  onConfirm,
  onClose,
}: Props) {
  const faktury = FAKTURY_PLATBY.filter(
    (f) =>
      selectedFaIds.has(f.id) &&
      (provozovna === 'all' || f.provozovna === provozovna)
  );
  const ostatni = OSTATNI_PLATBY.filter(
    (o) =>
      selectedOstatniIds.has(o.id) &&
      (provozovna === 'all' || o.provozovna === provozovna)
  );

  const sumaFa     = faktury.reduce((s, f) => s + f.castka, 0);
  const sumaOst    = ostatni.reduce((s, o) => s + o.castka, 0);
  const sumaTotal  = sumaFa + sumaOst;
  const nedostatek = vysledekBalance < 0;
  const zustatek   = getZustatek(provozovna);

  return (
    <>
      {/* Overlay */}
      <div className="overlay" onClick={onClose} style={{ zIndex: 400 }} />

      {/* Modal
          COMPONENT: Modal Dialog
          SOURCE: Larkon-like → Bootstrap Modal
          CUSTOM: NO */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          maxWidth: '95vw',
          background: 'white',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--sh-xl)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.15s ease',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-1)' }}>
              {nedostatek ? '⚠ Upozornění – nedostatek prostředků' : 'Potvrdit odeslání plateb'}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', marginTop: 3 }}>
              Platby budou odeslány do banky · faktury se označí jako „Odesláno k úhradě"
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Nedostatek warning */}
        {nedostatek && (
          <div
            style={{
              margin: '16px 24px 0',
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              color: 'var(--c-err-text)',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            Na účtu je {fCzk(zustatek)}, platby celkem {fCzk(sumaTotal)}. Rozdíl:{' '}
            <strong>{fCzk(Math.abs(vysledekBalance))}</strong> chybí.
            Systém umožní odeslání, ale upozorňuje na možný nedostatek krytí.
          </div>
        )}

        {/* Modal body */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
          {/* Shrnutí */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <SummaryBox label="Faktury" count={faktury.length} suma={sumaFa} color="#3b82f6" />
            <SummaryBox label="Ostatní platby" count={ostatni.length} suma={sumaOst} color="#d97706" />
          </div>

          {/* Faktury list */}
          {faktury.length > 0 && (
            <>
              <div className="drawer-section-title mb-2">Faktury k odeslání</div>
              <table className="dtable" style={{ marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th>Dodavatel</th>
                    <th>Splatnost</th>
                    <th className="td-r">Částka</th>
                  </tr>
                </thead>
                <tbody>
                  {faktury.map((f) => (
                    <tr key={f.id}>
                      <td className="fw-500">{f.dodavatel}</td>
                      <td className="c-2">{fDate(f.splatnost)}</td>
                      <td className="td-r td-mono fw-600">{fCzk(f.castka)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={2} className="fw-700">Faktury celkem</td>
                    <td className="td-r td-mono fw-700" style={{ color: '#3b82f6' }}>{fCzk(sumaFa)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* Ostatní platby list */}
          {ostatni.length > 0 && (
            <>
              <div className="drawer-section-title mb-2">Ostatní platby</div>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Popis</th>
                    <th>Datum</th>
                    <th className="td-r">Částka</th>
                  </tr>
                </thead>
                <tbody>
                  {ostatni.map((o) => (
                    <tr key={o.id}>
                      <td className="fw-500">{o.popis}</td>
                      <td className="c-2">{fDate(o.datum)}</td>
                      <td className="td-r td-mono fw-600">{fCzk(o.castka)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={2} className="fw-700">Ostatní celkem</td>
                    <td className="td-r td-mono fw-700" style={{ color: '#d97706' }}>{fCzk(sumaOst)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Total + footer */}
        <div
          style={{
            padding: '14px 24px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--bg)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>Celkem k odeslání</span>
            <span style={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums', color: 'var(--text-1)' }}>
              {fCzk(sumaTotal)}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              className="btn btn-secondary flex-1"
              style={{ justifyContent: 'center' }}
              onClick={onClose}
            >
              Zpět – upravit výběr
            </button>
            <button
              className="btn flex-1"
              style={{
                justifyContent: 'center',
                background: nedostatek ? '#dc2626' : '#2563eb',
                color: 'white',
                borderColor: nedostatek ? '#dc2626' : '#2563eb',
              }}
              onClick={onConfirm}
            >
              {nedostatek
                ? `⚠ Odeslat i přes nedostatek (${fCzk(sumaTotal)})`
                : `✓ Potvrdit odeslání (${fCzk(sumaTotal)})`}
            </button>
          </div>

          {nedostatek && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Potvrzením beru na vědomí, že na účtu nemusí být dostatek prostředků.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryBox({
  label,
  count,
  suma,
  color,
}: {
  label: string;
  count: number;
  suma: number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: color + '0d',
        border: `1px solid ${color}33`,
        borderRadius: 'var(--r-md)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
        {fCzk(suma)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
        {count} {count === 1 ? 'položka' : count < 5 ? 'položky' : 'položek'}
      </div>
    </div>
  );
}
