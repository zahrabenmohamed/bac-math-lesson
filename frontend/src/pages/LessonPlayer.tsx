import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { BoltIcon, CheckIcon, CloseIcon, CrossIcon } from '../components/Icons'
import { ExerciseView } from '../components/exercises/ExerciseView'
import { api } from '../lib/api'
import { initialPlayerState, playerReducer } from '../lib/player'
import { Rich } from '../lib/Rich'
import { WidgetHost } from '../widgets/WidgetHost'
import type { AnswerPayload } from '../lib/types'

export function LessonPlayer() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data: lesson, isPending, error } = useQuery({
    queryKey: ['lesson', id], queryFn: () => api.getLesson(id), staleTime: Infinity, gcTime: 0,
  })
  const back = lesson?.chapterId ? `/chapitres/${lesson.chapterId}` : '/'
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState)
  const [answer, setAnswer] = useState<AnswerPayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  const total = lesson?.steps.length ?? 0
  const step = lesson?.steps[state.index]
  const isExercise = step?.type === 'EXERCISE'
  const canAct = !busy && (!isExercise || state.result !== null || answer !== null)

  const finish = useCallback(async () => {
    await api.completeLesson(id)
    qc.invalidateQueries()
  }, [id, qc])

  const act = useCallback(async () => {
    if (!step || !canAct) return
    if (step.type === 'EXERCISE' && !state.result) {
      setBusy(true)
      setActionError(null)
      try {
        const result = await api.answer(step.exercise.id, answer!, state.hintUsed)
        dispatch({ type: 'checked', result })
        qc.invalidateQueries({ queryKey: ['progress'] })
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      } finally { setBusy(false) }
      return
    }
    setAnswer(null)
    setActionError(null)
    if (state.index + 1 >= total) {
      try { await finish() } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Une erreur est survenue.')
        return
      }
    }
    dispatch({ type: 'next', total })
  }, [step, canAct, state.result, state.hintUsed, state.index, answer, total, qc, finish])

  // Enter checks / continues (ignored when a button or link has focus: those handle Enter natively).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== 'Enter' || t.tagName === 'BUTTON' || t.tagName === 'A') return
      e.preventDefault()
      void act()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act])

  if (isPending) return <p className="p-8 text-muted">Chargement…</p>
  if (error || !lesson) return <p role="alert" className="p-8 text-incorrect">Leçon introuvable.</p>

  if (total === 0) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Rien à réviser</h1>
        <p className="mt-2 text-muted">Toutes vos erreurs sont maîtrisées.</p>
        <Link to={back} className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand">Retour au chapitre</Link>
      </div>
    )
  }

  if (state.finished) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mb-4 flex justify-center"><Emblem label={id} earned size={96} /></div>
        <h1 className="text-2xl font-semibold">{id === 'review' ? 'Révision terminée' : 'Leçon terminée'}</h1>
        <p className="mt-1 text-muted">{lesson.title}</p>
        <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-surface p-3">
            <dt className="text-sm text-muted">Réussites</dt>
            <dd className="font-mono text-xl">{state.correctCount}/{state.answeredCount}</dd>
          </div>
          <div className="rounded-lg bg-accent p-3 text-on-accent">
            <dt className="text-sm">XP gagnés</dt>
            <dd className="font-mono text-xl">+{state.xpGained}</dd>
          </div>
        </dl>
        <Link to={back} autoFocus className="mt-8 inline-block rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand">
          Retour au chapitre
        </Link>
      </div>
    )
  }

  const result = state.result
  const last = state.index + 1 >= total
  const primaryLabel = isExercise && !result ? 'Vérifier' : last ? 'Terminer' : 'Continuer'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Link to={back} aria-label="Quitter la leçon" className="text-muted hover:text-text"><CloseIcon /></Link>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progression de la leçon"
            aria-valuenow={state.index} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full bg-brand transition-[width]" style={{ width: `${(state.index / total) * 100}%` }} />
          </div>
          <span className="font-mono text-sm text-muted">{state.index + 1}/{total}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {step?.type === 'EXPLANATION' && (
          <article>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{lesson.title}</p>
            <h1 className="mb-4 text-2xl font-semibold tracking-tight">{step.title}</h1>
            <Rich text={step.body} />
            {step.widget && <WidgetHost widget={step.widget} />}
            {step.keypoint && (
              <aside aria-label="À retenir" className="mt-6 rounded-xl border-l-4 border-brand bg-brand-soft p-4">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand">À retenir</p>
                <Rich text={step.keypoint} />
              </aside>
            )}
            {step.example && (
              <section className="mt-6 rounded-xl border border-line bg-surface p-5" aria-label="Exemple">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand">Exemple</h2>
                <Rich text={step.example.statement} />
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-brand">Voir la résolution</summary>
                  <Rich text={step.example.solution} className="mt-2" />
                </details>
              </section>
            )}
          </article>
        )}

        {step?.type === 'EXERCISE' && (
          <>
            <ExerciseView key={step.exercise.id + state.index} exercise={step.exercise} result={result} onChange={setAnswer} />
            {!result && (
              <div className="mt-6">
                {state.hint ? (
                  <p className="rounded-lg border border-line bg-surface p-3 text-sm"><strong className="font-semibold">Indice : </strong><Rich text={state.hint} className="inline" /></p>
                ) : (
                  <button type="button" onClick={async () => dispatch({ type: 'hint', text: await api.getHint(step.exercise.id) })}
                    className="text-sm font-medium text-brand underline underline-offset-4">
                    Afficher un indice (−5 XP)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className={`sticky bottom-0 border-t ${result ? (result.correct ? 'border-correct' : 'border-incorrect') : 'border-line'} bg-surface`}>
        <div className="mx-auto max-w-3xl px-4 py-4">
          {actionError && <p role="alert" className="mb-3 text-sm font-medium text-incorrect">{actionError}</p>}
          {result && (
            <div role="status" aria-live="polite" className="mb-4">
              <p className={`flex items-center gap-2 text-lg font-semibold ${result.correct ? 'text-correct' : 'text-incorrect'}`}>
                {result.correct ? <><CheckIcon /> Correct</> : <><CrossIcon /> Incorrect</>}
                {result.xpAwarded > 0 && (
                  <span className="ml-2 flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-sm font-medium text-on-accent">
                    <BoltIcon /> +{result.xpAwarded} XP
                  </span>
                )}
                {result.mastered && <span className="ml-2 text-sm font-medium text-brand">Question maîtrisée</span>}
              </p>
              {!result.correct && result.explanation && <Rich text={result.explanation} className="mt-2 text-sm" />}
              <details className="mt-2" open={!result.correct}>
                <summary className="cursor-pointer text-sm font-medium text-brand">Solution</summary>
                <Rich text={result.solution} className="mt-1 text-sm" />
              </details>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="hidden text-sm text-muted sm:inline">Appuyez sur <kbd className="rounded border border-line px-1.5 font-mono">Entrée</kbd></span>
            <button ref={primaryRef} type="button" onClick={() => void act()} disabled={!canAct}
              className="ml-auto rounded-lg bg-brand px-6 py-2.5 font-medium text-on-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
              {primaryLabel}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
