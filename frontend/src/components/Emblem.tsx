const SHAPES = [
  '32,4 56,18 56,46 32,60 8,46 8,18', // hexagon
  '32,4 60,32 32,60 4,32', // diamond
  '22,6 42,6 58,22 58,42 42,58 22,58 6,42 6,22', // octagon
]

/** Geometric completion badge. Earned = filled with brand colours; otherwise a dashed outline. */
export function Emblem({ label, earned, size = 48 }: { label: string; earned: boolean; size?: number }) {
  const n = Number(label.replace(/\D/g, '')) || 0
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <polygon
        points={SHAPES[n % SHAPES.length]}
        fill={earned ? 'var(--brand-soft)' : 'none'}
        stroke={earned ? 'var(--brand)' : 'var(--muted)'}
        strokeWidth="3"
        strokeDasharray={earned ? undefined : '5 4'}
        strokeLinejoin="round"
      />
      <text x="32" y="38" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600"
        fontSize="18" fill={earned ? 'var(--brand)' : 'var(--muted)'}>
        {label.startsWith('B') ? '★' : n}
      </text>
    </svg>
  )
}
