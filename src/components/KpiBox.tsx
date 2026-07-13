// COMPONENT: KpiBox — sjednocený KPI box napříč systémem
// Vizuál převzatý z Tržby (.trzby-box): plochý světlý box —
// label (vlevo nahoře) + volitelný badge (vpravo nahoře) + velká hodnota
// + volitelný sub text + volitelný footer (divider + label/hodnota).
// Cíl: jeden opakovaně použitelný prvek místo mnoha různých KPI/stat karet.

export type KpiBadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'muted';

export interface KpiBoxProps {
  label: string;
  value: string;
  badge?: { text: string; tone: KpiBadgeTone; icon?: string };
  sub?: string;
  footer?: { label: string; value: string; color?: string };
  icon?: string;          // volitelná ikona vedle labelu
  iconColor?: string;
  onClick?: () => void;
  alert?: boolean;        // zvýraznění (např. „vyžaduje pozornost")
}

const TONE_CLS: Record<KpiBadgeTone, string> = {
  success: 'bg-success-subtle text-success',
  danger:  'bg-danger-subtle text-danger',
  warning: 'bg-warning-subtle text-warning',
  info:    'bg-info-subtle text-info',
  muted:   'bg-light text-muted border',
};

export default function KpiBox({ label, value, badge, sub, footer, icon, iconColor, onClick, alert }: KpiBoxProps) {
  return (
    <div
      className={`kpi-box h-100${onClick ? ' kpi-box--click' : ''}${alert ? ' kpi-box--alert' : ''}`}
      onClick={onClick}
    >
      <div className="kpi-box-head">
        <span className="kpi-box-label">
          {icon && <iconify-icon icon={icon} style={{ fontSize: 28, color: iconColor }} />}
          {label}
        </span>
        {badge && (
          <span className={`badge kpi-box-badge ${TONE_CLS[badge.tone]}`}>
            {badge.icon && <iconify-icon icon={badge.icon} className="me-1" />}
            {badge.text}
          </span>
        )}
      </div>
      <div className="kpi-box-value czk-num">{value}</div>
      {sub && <div className="kpi-box-sub">{sub}</div>}
      {footer && (
        <>
          <div className="kpi-box-divider" />
          <div className="kpi-box-foot">
            <span>{footer.label}</span>
            <span className="kpi-box-foot-amount czk-num" style={{ color: footer.color }}>{footer.value}</span>
          </div>
        </>
      )}
    </div>
  );
}
