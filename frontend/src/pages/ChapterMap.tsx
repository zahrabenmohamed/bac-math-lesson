import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { CheckIcon, LockIcon } from '../components/Icons'
import { api } from '../lib/api'
import type { LessonSummary } from '../lib/types'

function Status({ l }: { l: LessonSummary }) {
  if (l.status === 'completed') return <span className="flex items-center gap-1 text-correct"><CheckIcon /> Terminée</span>
  if (l.status === 'locked') return <span className="flex items-center gap-1 text-muted"><LockIcon /> Verrouillée</span>
  return <span className="text-brand">{l.stepsDone > 0 ? 'En cours' : 'À faire'}</span>
}

function Node({ l, primary }: { l: LessonSummary; primary: boolean }) {
  const locked = l.status === 'locked'
  const pct = Math.round((l.stepsDone / l.stepsTotal) * 100)
  const body = (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${
      primary ? 'border-brand bg-brand-soft' : 'border-line bg-surface'} ${locked ? 'opacity-70' : 'hover:border-brand'}`}>
      <Emblem label={l.kind === 'BOSS' ? 'B' : l.id} earned={l.status === 'completed'} size={52} />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium leading-snug">{l.title}</h3>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <Status l={l} />
          {l.status !== 'locked' && (
            <span className="font-mono text-muted">{l.stepsDone}/{l.stepsTotal} exercices</span>
          )}
        </div>
        {l.status !== 'locked' && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar"
            aria-label={`Progression : ${l.title}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
  return locked ? <div aria-disabled="true">{body}</div> : <Link to={`/lecons/${l.id}`} className="block">{body}</Link>
}

export function ChapterMap() {
  const { data, isPending, error } = useQuery({ queryKey: ['chapter'], queryFn: api.getChapter })
  if (isPending) return <p className="text-muted">Chargement…</p>
  if (error) return <p role="alert" className="text-incorrect">Impossible de charger le parcours.</p>

  const next = data.lessons.find((l) => l.status === 'unlocked')
  const done = data.lessons.filter((l) => l.status === 'completed').length

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">2ème Bac · Sciences physiques / SVT</p>
          <h1 className="text-3xl font-semibold tracking-tight">{data.title}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{done}/{data.lessons.length} étapes terminées</p>
        </div>
        {next && (
          <Link to={`/lecons/${next.id}`}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand hover:opacity-90">
            {next.stepsDone > 0 ? 'Reprendre' : 'Commencer'} : {next.kind === 'BOSS' ? 'exercice final' : `leçon ${next.id.slice(1)}`}
          </Link>
        )}
      </div>

      {([1, 2] as const).map((part) => (
        <section key={part} className="mb-10" aria-labelledby={`part-${part}`}>
          <h2 id={`part-${part}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Partie {part}</h2>
          <ol className="ml-5 space-y-3 border-l-2 border-line pl-6">
            {data.lessons.filter((l) => l.part === part).map((l) => (
              <li key={l.id} className="relative">
                <span className="absolute -left-[33px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-line bg-bg" aria-hidden="true" />
                <Node l={l} primary={l.id === next?.id} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
