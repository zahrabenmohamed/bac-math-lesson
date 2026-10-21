import { useQuery } from '@tanstack/react-query'
import { BoltIcon, FlameIcon } from '../components/Icons'
import { api } from '../lib/api'

export function Profile() {
  const { data, isPending } = useQuery({ queryKey: ['progress'], queryFn: api.getProgress })
  if (isPending || !data) return <p className="text-muted">Chargement…</p>

  const max = Math.max(1, ...data.weeks.map((w) => w.count))
  const pct = Math.round((data.xpInLevel / data.xpForNext) * 100)

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>

      <section aria-label="Résumé" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Niveau</p>
          <p className="font-mono text-3xl">{data.level}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progression vers le niveau suivant"
            aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 font-mono text-xs text-muted">{data.xpInLevel}/{data.xpForNext} XP</p>
        </div>
        <div className="rounded-xl bg-accent p-4 text-on-accent">
          <p className="flex items-center gap-1 text-sm"><BoltIcon /> XP total</p>
          <p className="font-mono text-3xl">{data.xp}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-1 text-sm text-muted"><FlameIcon /> Série</p>
          <p className="font-mono text-3xl">{data.streakDays} <span className="text-base text-muted">jours</span></p>
        </div>
      </section>

      <section aria-labelledby="weeks">
        <h2 id="weeks" className="mb-3 text-lg font-semibold">Activité des 8 dernières semaines</h2>
        <svg viewBox="0 0 400 140" className="w-full max-w-xl" role="img"
          aria-label={`Exercices par semaine : ${data.weeks.map((w) => `${w.label} ${w.count}`).join(', ')}`}>
          {data.weeks.map((w, i) => {
            const h = (w.count / max) * 90
            return (
              <g key={i}>
                <rect x={i * 50 + 10} y={100 - h} width="30" height={Math.max(h, 2)} rx="3"
                  fill={w.count ? 'var(--brand)' : 'var(--line)'} />
                <text x={i * 50 + 25} y={95 - h} textAnchor="middle" fontSize="11" fill="var(--text)" fontFamily="IBM Plex Mono">{w.count || ''}</text>
                <text x={i * 50 + 25} y="120" textAnchor="middle" fontSize="10" fill="var(--muted)">{w.label}</text>
              </g>
            )
          })}
        </svg>
      </section>

      <div className="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="results">
          <h2 id="results" className="mb-3 text-lg font-semibold">Résultats par leçon</h2>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {data.lessons.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{l.title}</span>
                <span className="font-mono text-muted">{l.total ? `${l.correct}/${l.total}` : '—'}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="weak">
          <h2 id="weak" className="mb-3 text-lg font-semibold">Compétences à renforcer</h2>
          {data.weakSkills.length === 0 ? (
            <p className="text-sm text-muted">Répondez à quelques exercices pour voir vos points faibles.</p>
          ) : (
            <ul className="space-y-3">
              {data.weakSkills.map((s) => (
                <li key={s.skill}>
                  <div className="flex justify-between text-sm"><span>{s.skill}</span><span className="font-mono">{Math.round(s.rate * 100)} %</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-warning" style={{ width: `${s.rate * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
