import { useI18n } from '../i18n';

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export { daysUntil };

export function DeadlineBadge({
  deadline,
  t,
}: {
  deadline: string;
  t: ReturnType<typeof useI18n>;
}) {
  const days = daysUntil(deadline);
  const color =
    days < 0 ? '#a0aec0' : days === 0 ? '#e53e3e' : days <= 7 ? '#dd6b20' : days <= 30 ? '#d69e2e' : '#38a169';
  const label =
    days < 0
      ? t.common.expired
      : days === 0
      ? t.common.today
      : days === 1
      ? t.common.tomorrow
      : `${days} ${t.common.daysLeft}`;

  return (
    <span
      style={{
        background: color,
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
