import { useState } from 'react'
import { Rich } from '../../lib/Rich'
import type { AnswerPayload, AnswerResult, Exercise } from '../../lib/types'
import { CheckIcon, CrossIcon } from '../Icons'

interface Props {
  exercise: Exercise
  result: AnswerResult | null
  onChange: (answer: AnswerPayload | null) => void
}

const optionClass = (selected: boolean, locked: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
    selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-brand'
  } ${locked ? 'cursor-default opacity-90' : ''}`

export function ExerciseView({ exercise, result, onChange }: Props) {
  const locked = result !== null
  const [choices, setChoices] = useState<string[]>([])
  const [text, setText] = useState('')

  const header = (
    <div className="mb-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{exercise.skill}</p>
      <Rich text={exercise.prompt} className="text-lg" />
    </div>
  )

  if (exercise.type === 'QCM') {
    const toggle = (id: string) => {
      const next = exercise.multiple
        ? choices.includes(id) ? choices.filter((c) => c !== id) : [...choices, id]
        : [id]
      setChoices(next)
      onChange(next.length ? { choices: next } : null)
    }
    return (
      <fieldset disabled={locked}>
        <legend className="sr-only">{exercise.multiple ? 'Plusieurs réponses possibles' : 'Une seule réponse'}</legend>
        {header}
        <div className="space-y-2">
          {exercise.options.map((o) => (
            <label key={o.id} className={optionClass(choices.includes(o.id), locked)}>
              <input type={exercise.multiple ? 'checkbox' : 'radio'} name={exercise.id}
                className="mt-1.5 accent-[var(--brand)]" checked={choices.includes(o.id)} onChange={() => toggle(o.id)} />
              <Rich text={o.text} />
            </label>
          ))}
        </div>
        {exercise.multiple && <p className="mt-3 text-sm text-muted">Plusieurs réponses possibles.</p>}
      </fieldset>
    )
  }

  if (exercise.type === 'NUMERIC') {
    return (
      <div>
        {header}
        <label htmlFor="answer" className="mb-1 block text-sm font-medium">Votre réponse</label>
        <input id="answer" type="text" inputMode="text" autoComplete="off" autoFocus disabled={locked}
          value={text} placeholder={exercise.placeholder}
          onChange={(e) => { setText(e.target.value); onChange(e.target.value.trim() ? { text: e.target.value } : null) }}
          className="w-full max-w-sm rounded-lg border border-line bg-surface px-4 py-2.5 font-mono text-lg" />
        <p className="mt-2 text-sm text-muted">
          {exercise.format === 'complex'
            ? 'Forme algébrique, par exemple 3 - 2i. L’ordre des termes n’a pas d’importance.'
            : 'Valeur exacte (sqrt(10), 1/2) ou décimale.'}
        </p>
      </div>
    )
  }

  // METHOD: each stage appears once the previous one is answered.
  const pick = (stage: number, id: string) => {
    const next = [...choices.slice(0, stage), id]
    setChoices(next)
    onChange(next.length === exercise.stages.length ? { choices: next } : null)
  }
  return (
    <div>
      {header}
      <ol className="space-y-6">
        {exercise.stages.slice(0, Math.min(choices.length + 1, exercise.stages.length)).map((st, i) => (
          <li key={i}>
            <fieldset disabled={locked}>
              <legend className="mb-2 flex items-center gap-2 font-medium">
                <span className="font-mono text-sm text-muted">Étape {i + 1}</span> <Rich text={st.question} />
                {result?.stageResults && (
                  <span className={`ml-auto flex items-center gap-1 text-sm ${result.stageResults[i] ? 'text-correct' : 'text-incorrect'}`}>
                    {result.stageResults[i] ? <><CheckIcon /> Correct</> : <><CrossIcon /> Incorrect</>}
                  </span>
                )}
              </legend>
              <div className="space-y-2">
                {st.options.map((o) => (
                  <label key={o.id} className={optionClass(choices[i] === o.id, locked)}>
                    <input type="radio" name={`${exercise.id}-${i}`} className="mt-1.5 accent-[var(--brand)]"
                      checked={choices[i] === o.id} onChange={() => pick(i, o.id)} />
                    <Rich text={o.text} />
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
    </div>
  )
}
