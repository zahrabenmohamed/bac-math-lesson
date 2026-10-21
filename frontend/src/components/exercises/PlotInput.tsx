import { useState, type KeyboardEvent } from 'react'
import { Tex } from '../../lib/Rich'
import type { AnswerPayload } from '../../lib/types'
import { complexTex, type C } from '../../widgets/math'
import { Dot, O, Plane, Seg } from '../../widgets/Plane'

interface Props {
  range: number
  locked: boolean
  correct?: boolean
  onChange: (answer: AnswerPayload | null) => void
}

const ARROWS: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }
const STEP = 0.5

/** The student places a point on the complex plane (click/tap, or arrow keys); the server checks it. */
export function PlotInput({ range, locked, correct, onChange }: Props) {
  const [p, setP] = useState<C | null>(null)

  const place = (z: C) => {
    if (locked) return
    setP(z)
    onChange({ point: { re: z.re, im: z.im } })
  }
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const d = ARROWS[e.key]
    if (!d || locked) return
    e.preventDefault()
    const base = p ?? O
    const clamp = (x: number) => Math.max(-range, Math.min(range, x))
    place({ re: clamp(base.re + d[0] * STEP) || 0, im: clamp(base.im + d[1] * STEP) || 0 })
  }

  const color = !locked ? 'var(--brand)' : correct ? 'var(--correct)' : 'var(--incorrect)'
  return (
    <div>
      <Plane range={range} snap={STEP} label="Plan complexe : placez le point demandé" onPlace={place} onKeyDown={onKeyDown} tabIndex={locked ? -1 : 0}>
        {p && <Seg a={O} b={p} dashed color={color} width={1.4} />}
        {p && <Dot z={p} label="M" color={color} />}
      </Plane>
      <p className="mt-2 text-sm" aria-live="polite">
        {p ? (
          <>Point placé : <Tex tex={`M(${complexTex(p).replace(/^\\approx /, '')})`} /> — abscisse {p.re}, ordonnée {p.im}.</>
        ) : (
          <span className="text-muted">Cliquez ou touchez le plan pour placer le point. Au clavier : activez le plan, puis utilisez les flèches.</span>
        )}
      </p>
    </div>
  )
}
