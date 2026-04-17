// COMPONENT: Balance Panel – kalkulátor dostupnosti prostředků (sticky)
// SOURCE: standard admin pattern → Card (sticky)
// CUSTOM: YES – live přepočet s logiku budoucích tržeb (specifické pro doménu)

import type { ProvozovnaId } from '../types';
import type { FutureRevMode } from '../platbyData';
import {
  FAKTURY_PLATBY,
  OSTATNI_PLATBY,
  getZustatek,
  getCekajiciKarty,
  getOdhadZbytek,
} from '../platbyData';
import { fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  selectedFaIds: Set<string>;
  selectedOstatniIds: Set<string>;
  futureRevMode: FutureRevMode;
  onFutureRevChange: (m: FutureRevMode) => void;
  onPotvrdit: () => void;
}

export default function BalancePanel({
  provozovna,
  periodOd,
  periodDo,
  selectedFaIds,
  selectedOstatniIds,
  futureRevMode,
  onFutureRevChange,
  onPotvrdit,
}: Props) {
  // Základní zůstatek
  const zustatek = getZustatek(provozovna);

  // Vybrané faktury
  const vybrFaktury = FAKTURY_PLATBY.filter(
    (f) =>
      selectedFaIds.has(f.id) &&
      (provozovna === 'all' || f.provozovna === provozovna)
  );
  const sumaFaktury = vybrFaktury.reduce((s, f) => s + f.castka, 0);

  // Vybrané ostatní platby
  const vybrOstatni = OSTATNI_PLATBY.filter(
    (o) =>
      selectedOstatniIds.has(o.id) &&
      (provozovna === 'all' || o.provozovna === provozovna) &&
      o.datum >= periodOd &&
      o.datum <= periodDo
  );
  const sumaOstatni = vybrOstatni.reduce((s, o) => s + o.castka, 0);

  // Budoucí tržby
  const cekajiciKarty = futureRevMode !== 'off' ? getCekajiciKarty(provozovna) : 0;
  const odhadZbytek   = futureRevMode === 'budouci-plus' ? getOdhadZbytek(provozovna) : 0;

  // Výsledek
  const bezTrzeb   = zustatek - sumaFaktury - sumaOstatni;
  const sBudoucimi  = bezTrzeb + cekajiciKarty;
  const sBudoucimiPlus = sBudoucimi + odhadZbytek;

  // Které číslo zobrazit jako hlavní výsledek
  const vysledek =
    futureRevMode === 'budouci-plus'
      ? sBudoucimiPlus
      : futureRevMode === 'budouci'
      ? sBudoucimi
      : bezTrzeb;

  const dostatek = vysledek >= 0;
  const pocetVybrano = vybrFaktury.length + vybrOstatni.length;

  return (
    // COMPONENT: Sticky Balance Calculator Card
    // SOURCE: standard admin pattern → Card (position sticky)
    // CUSTOM: YES – doménová logika budoucích tržeb
    <div
      style={{
        position: 'sticky',
        top: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Kalkulátor */}
      <div
        className="card"
        style={{
          borderTop: `4px solid ${dostatek ? 'var(--c-ok)' : 'var(--c-err)'}`,
        }}
      >
        <div className="card-header" style={{ paddingBottom: 12 }}>
          <div className="card-title-wrap">
            <div className="card-title">Dostupnost prostředků</div>
            <div className="card-sub">{pocetVybrano} položek vybráno</div>
          </div>
        </div>

        <div className="card-body" style={{ paddingTop: 12 }}>
          {/* Řádky kalkulace */}
          <BalRow label="Zůstatek na účtu" value={zustatek} color="var(--c-info)" bold />
          <BalRow
            label={`Faktury (${vybrFaktury.length})`}
            value={-sumaFaktury}
            color={sumaFaktury > 0 ? 'var(--c-err)' : 'var(--text-2)'}
          />
          <BalRow
            label={`Ostatní platby (${vybrOstatni.length})`}
            value={-sumaOstatni}
            color={sumaOstatni > 0 ? 'var(--c-err)' : 'var(--text-2)'}
          />

          {/* Mezisoučet bez tržeb */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0 10px' }} />
          <BalRow
            label="Bez zahrnutí tržeb"
            value={bezTrzeb}
            color={bezTrzeb >= 0 ? 'var(--c-ok)' : 'var(--c-err)'}
            bold
          />

          {/* Budoucí tržby */}
          {futureRevMode !== 'off' && (
            <>
              <BalRow
                label="+ Tržby z karet (čekající)"
                value={cekajiciKarty}
                color="var(--c-info)"
                indent
              />
              <BalRow
                label="= S budoucími tržbami"
                value={sBudoucimi}
                color={sBudoucimi >= 0 ? 'var(--c-ok)' : 'var(--c-err)'}
                bold
              />
            </>
          )}

          {futureRevMode === 'budouci-plus' && (
            <>
              <BalRow
                label="+ Odhadované tržby (zbytek týdne)"
                value={odhadZbytek}
                color="#7c3aed"
                indent
              />
              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0 10px' }} />
              <BalRow
                label="= S budoucími tržbami+"
                value={sBudoucimiPlus}
                color={sBudoucimiPlus >= 0 ? 'var(--c-ok)' : 'var(--c-err)'}
                bold
              />
            </>
          )}

          {/* Výsledný status */}
          <div
            style={{
              background: dostatek ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${dostatek ? '#86efac' : '#fca5a5'}`,
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: dostatek ? 'var(--c-ok)' : 'var(--c-err)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.1,
              }}
            >
              {dostatek ? '+' : ''}{fCzk(vysledek)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: dostatek ? 'var(--c-ok-text)' : 'var(--c-err-text)',
                marginTop: 4,
              }}
            >
              {dostatek ? '✓ Prostředky dostačují' : '⚠ Nedostatek prostředků'}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card-footer" style={{ flexDirection: 'column', gap: 8 }}>
          <button
            className={`btn w-full ${pocetVybrano > 0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={onPotvrdit}
            disabled={pocetVybrano === 0}
          >
            {pocetVybrano === 0
              ? 'Vyberte faktury k úhradě'
              : `Odeslat ${pocetVybrano} plateb do banky →`}
          </button>
          {!dostatek && pocetVybrano > 0 && (
            <div
              className="fs-xs fw-600 text-c"
              style={{ color: 'var(--c-err-text)', lineHeight: 1.4 }}
            >
              ⚠ Systém upozorní na nedostatek. Potvrzení bude možné i přesto.
            </div>
          )}
        </div>
      </div>

      {/* Toggle budoucích tržeb
          COMPONENT: Segment Control / Toggle Group
          SOURCE: standard admin pattern
          CUSTOM: NO */}
      <div className="card">
        <div className="card-body" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <div className="fs-xs fw-700 c-2 mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Zahrnout budoucí tržby
          </div>
          <div className="flex flex-col gap-2">
            {(
              [
                {
                  value: 'off' as FutureRevMode,
                  label: 'Pouze zůstatek',
                  desc: 'Jen aktuální stav účtu',
                  color: 'var(--text-2)',
                },
                {
                  value: 'budouci' as FutureRevMode,
                  label: 'Budoucí tržby',
                  desc: 'Zůstatek + kartové platby v cestě',
                  color: 'var(--c-info)',
                },
                {
                  value: 'budouci-plus' as FutureRevMode,
                  label: 'Budoucí tržby+',
                  desc: 'Zůstatek + karty + odhad zbytku týdne',
                  color: '#7c3aed',
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFutureRevChange(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--r-md)',
                  border: `1px solid ${futureRevMode === opt.value ? opt.color : 'var(--border)'}`,
                  background:
                    futureRevMode === opt.value
                      ? opt.color + '12'
                      : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.14s',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: `2px solid ${opt.color}`,
                    background: futureRevMode === opt.value ? opt.color : 'transparent',
                    flexShrink: 0,
                    transition: 'background 0.14s',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: futureRevMode === opt.value ? opt.color : 'var(--text-1)',
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
                {futureRevMode === opt.value && (
                  <span style={{ marginLeft: 'auto', color: opt.color, fontWeight: 700, fontSize: 12 }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Popis odhadu */}
          {futureRevMode === 'budouci-plus' && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                background: '#f5f3ff',
                borderRadius: 'var(--r-sm)',
                fontSize: 11,
                color: '#5b21b6',
                lineHeight: 1.5,
              }}
            >
              Odhad = průměr stejného týdne minulého roku + 3 předchozí týdny aktuálního roku
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: jeden řádek kalkulace ────────────────────────────

function BalRow({
  label,
  value,
  color,
  bold,
  indent,
}: {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
  indent?: boolean;
}) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  const absVal = Math.abs(value);
  return (
    <div
      className="flex justify-between items-center"
      style={{
        padding: '5px 0',
        paddingLeft: indent ? 12 : 0,
        fontSize: bold ? 13 : 12,
        borderBottom: bold ? '1px solid var(--border-light)' : undefined,
        marginBottom: bold ? 4 : 0,
      }}
    >
      <span style={{ color: 'var(--text-2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span
        style={{
          color,
          fontWeight: bold ? 700 : 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value === 0 ? '—' : `${prefix} ${fCzk(absVal)}`}
      </span>
    </div>
  );
}
