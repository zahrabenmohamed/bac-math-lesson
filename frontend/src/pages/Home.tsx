import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckIcon, LockIcon } from '../components/Icons'
import { api } from '../lib/api'
import type { ChapterSummary } from '../lib/types'

function Row({ c, primary }: { c: ChapterSummary; primary: boolean }) {
  const pct = c.lessonsTotal ? Math.round((c.lessonsDone / c.lessonsTotal) * 100) : 0
  const complete = c.available && c.lessonsDone === c.lessonsTotal
  const body = (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${
      primary ? 'border-brand bg-brand-soft' : 'border-line bg-surface'} ${c.available ? 'hover:border-brand' : 'opacity-70'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-bg font-mono text-sm" aria-hidden="true">
        {String(c.position).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium leading-snug">{c.title}</h3>
        <p className="text-sm text-muted">{c.summary}</p>
        {c.available && (
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar"
              aria-label={`Progression : ${c.title}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono text-xs text-muted">{c.lessonsDone}/{c.lessonsTotal} étapes</span>
          </div>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm">
        {complete ? <span className="flex items-center gap-1 text-correct"><CheckIcon /> Terminé</span>
          : c.available ? <span className="text-brand">{c.lessonsDone > 0 ? 'En cours' : 'Disponible'}</span>
          : <span className="flex items-center gap-1 text-muted"><LockIcon /> À venir</span>}
      </span>
    </div>
  )
  return c.available ? <Link to={`/chapitres/${c.id}`} className="block">{body}</Link> : <div aria-disabled="true">{body}</div>
}

export function Home() {
  const { data, isPending, error } = useQuery({ queryKey: ['program'], queryFn: api.getProgram })
  if (isPending) return <p className="text-muted">Chargement…</p>
  if (error) return <p role="alert" className="text-incorrect">Impossible de charger le programme.</p>

  const available = data.filter((c) => c.available)
  const current = available.find((c) => c.nextLessonId)
  const doneLessons = available.reduce((n, c) => n + c.lessonsDone, 0)
  const totalLessons = available.reduce((n, c) => n + c.lessonsTotal, 0)

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">2ème Bac · Sciences physiques / SVT</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mon programme de l’année</h1>
          <p className="mt-1 font-mono text-sm text-muted">
            {available.length}/{data.length} chapitres disponibles · {doneLessons}/{totalLessons} étapes terminées
          </p>
        </div>
        {current?.nextLessonId && (
          <Link to={`/lecons/${current.nextLessonId}`}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand hover:opacity-90">
            {current.lessonsDone > 0 ? 'Reprendre' : 'Commencer'} : {current.title}
          </Link>
        )}
      </div>

      <ol className="space-y-3" aria-label="Chapitres du programme">
        {data.map((c) => (
          <li key={c.id}><Row c={c} primary={c.id === current?.id} /></li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-muted">
        Les chapitres « à venir » seront ajoutés au fil de l’année ; leurs leçons s’ouvriront ici dès qu’elles seront prêtes.
      </p>
    </div>
  )
}
