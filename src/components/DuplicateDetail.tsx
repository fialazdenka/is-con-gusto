import type { FakturaPlatby } from '../platbyData';
import { getVS, KATEGORIE_LABELS } from '../platbyData';
import { detectDuplicates, formatDuvod } from '../duplicateDetection';
import { FAKTURY_PLATBY } from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  faktura: FakturaPlatby;
  originalId?: string; // z MATCHING_DATA, pokud již označeno
}

const STAV_LABEL: Record<string, string> = {
  nova: 'Nová', 'ke-schvaleni': 'Ke schválení', schvalena: 'Schválená',
  zamitnuta: 'Zamítnutá', zastavena: 'Zastavená', zaplacena: 'Zaplacená',
  odeslana: 'Odeslaná', 'v-bance': 'V bance',
  'ceka-na-sparovani': 'Čeká na spárování', 'chyba-platby': 'Chyba platby',
};

type FieldDef = { label: string; getValue: (f: FakturaPlatby) => string; compare: boolean };

const FIELDS: FieldDef[] = [
  { label: 'Číslo faktury',  getValue: (f) => f.cislo,                     compare: true },
  { label: 'Variabilní symbol', getValue: (f) => getVS(f),                 compare: true },
  { label: 'Dodavatel',      getValue: (f) => f.dodavatel,                 compare: true },
  { label: 'Provozovna',     getValue: (f) => PROVOZOVNY.find((p) => p.id === f.provozovna)?.shortName ?? f.provozovna, compare: true },
  { label: 'Částka',         getValue: (f) => fCzk(f.castka),              compare: true },
  { label: 'Datum vystavení',getValue: (f) => fDate(f.datum),              compare: false },
  { label: 'Splatnost',      getValue: (f) => fDate(f.splatnost),          compare: false },
  { label: 'Kategorie',      getValue: (f) => KATEGORIE_LABELS[f.kategorie], compare: false },
  { label: 'Stav',           getValue: (f) => STAV_LABEL[f.stav] ?? f.stav, compare: false },
];

export default function DuplicateDetail({ faktura, originalId }: Props) {
  // Najdi originál — z MATCHING_DATA nebo z live detection
  const allFaktury = FAKTURY_PLATBY;
  const liveHits   = detectDuplicates(allFaktury);
  const liveHit    = liveHits.get(faktura.id);
  const resolvedOriginalId = originalId ?? liveHit?.originalId;
  const original = resolvedOriginalId
    ? allFaktury.find((f) => f.id === resolvedOriginalId)
    : null;

  const duvody     = liveHit?.duvody ?? [];
  const zavaznost  = liveHit?.zavaznost ?? (originalId ? 'warning' : undefined);
  const isCritical = zavaznost === 'critical';

  return (
    <div>
      {/* ── Alert banner ─────────────────────────────────── */}
      <div
        className={`d-flex align-items-start gap-2 p-2 rounded mb-3`}
        style={{
          background: isCritical ? '#fff5f5' : '#fffbeb',
          border: `1px solid ${isCritical ? '#fecaca' : '#fde68a'}`,
          fontSize: 12,
        }}
      >
        <iconify-icon
          icon={isCritical ? 'solar:danger-circle-bold-duotone' : 'solar:danger-triangle-bold-duotone'}
          style={{ fontSize: 18, color: isCritical ? '#dc3545' : '#d97706', flexShrink: 0, marginTop: 1 }}
        />
        <div>
          <div className="fw-bold" style={{ color: isCritical ? '#dc3545' : '#92400e' }}>
            {isCritical ? 'Kritická duplicita' : 'Možná duplicita'}
          </div>
          <div style={{ color: '#6c757d', marginTop: 2 }}>
            {duvody.length > 0
              ? duvody.map((d, i) => <div key={i}>• {formatDuvod(d)}</div>)
              : <div>• Stejný dodavatel, stejná částka, stejné období</div>
            }
          </div>
        </div>
      </div>

      {/* ── Side-by-side porovnání ───────────────────────── */}
      {original ? (
        <div style={{ border: '1px solid #e9ecef', borderRadius: 6, overflow: 'hidden', fontSize: 11 }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ padding: '6px 8px', color: '#6c757d', fontWeight: 600 }} />
            <div style={{ padding: '6px 8px', fontWeight: 700, color: '#dc3545', borderLeft: '1px solid #dee2e6' }}>
              <iconify-icon icon="solar:copy-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
              Tato faktura
            </div>
            <div style={{ padding: '6px 8px', fontWeight: 700, color: '#198754', borderLeft: '1px solid #dee2e6' }}>
              <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
              Originál ({resolvedOriginalId})
            </div>
          </div>

          {/* Rows */}
          {FIELDS.map((field, i) => {
            const valA    = field.getValue(faktura);
            const valB    = field.getValue(original);
            const matches = valA === valB;
            const isLast  = i === FIELDS.length - 1;
            const highlight = field.compare && matches;

            return (
              <div
                key={field.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 1fr',
                  borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
                  background: highlight ? '#fff5f5' : 'transparent',
                }}
              >
                <div style={{ padding: '5px 8px', color: '#9097a7', fontWeight: 500 }}>
                  {field.label}
                </div>
                <div style={{
                  padding: '5px 8px',
                  borderLeft: '1px solid #f0f0f0',
                  fontVariantNumeric: 'tabular-nums',
                  color: highlight ? '#dc3545' : '#1a1a1a',
                  fontWeight: highlight ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {highlight && (
                    <iconify-icon icon="solar:danger-triangle-bold-duotone"
                      style={{ fontSize: 11, color: '#dc3545', flexShrink: 0 }} />
                  )}
                  {valA}
                </div>
                <div style={{
                  padding: '5px 8px',
                  borderLeft: '1px solid #f0f0f0',
                  fontVariantNumeric: 'tabular-nums',
                  color: highlight ? '#dc3545' : '#6c757d',
                  fontWeight: highlight ? 700 : 400,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {highlight && (
                    <iconify-icon icon="solar:danger-triangle-bold-duotone"
                      style={{ fontSize: 11, color: '#dc3545', flexShrink: 0 }} />
                  )}
                  {valB}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted fs-12 fst-italic">
          Originál faktury nenalezen (ID: {resolvedOriginalId ?? '?'})
        </div>
      )}

      {/* ── Akce ─────────────────────────────────────────── */}
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-danger btn-sm flex-grow-1" style={{ fontSize: 12 }}>
          <iconify-icon icon="solar:close-circle-bold-duotone" className="me-1" />
          Potvrdit duplicitu — zamítnout
        </button>
        <button className="btn btn-light btn-sm flex-grow-1" style={{ fontSize: 12 }}>
          <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
          Není duplicita — pokračovat
        </button>
      </div>
    </div>
  );
}
