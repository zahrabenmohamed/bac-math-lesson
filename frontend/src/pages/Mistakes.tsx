import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Rich } from '../lib/Rich'

export function Mistakes() {
  const { data, isPending } = useQuery({ queryKey: ['mistakes'], queryFn: api.getMistakes, gcTime: 0 })
  if (isPending || !data) return <p className="text-muted">Chargement…</p>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mes erreurs</h1>
          <p className="text-sm text-muted">Une question est maîtrisée après 2 réussites consécutives.</p>
        </div>
        {data.length > 0 && (
          <Link to="/lecons/review" className="rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand hover:opacity-90">
            Lancer une révision ({data.length})
          </Link>
        )}
      </div>
      {data.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-muted">Aucune erreur à revoir pour l’instant.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.exerciseId} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{m.skill} · {m.lessonTitle}</p>
              <Rich text={m.prompt} className="mt-1" />
              <p className="mt-2 font-mono text-sm text-muted">{m.streak}/2 réussites consécutives</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
