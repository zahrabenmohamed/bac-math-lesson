import { useState } from 'react'
import { COLORS, Dot, Line, Plane, Seg, Slider, WidgetFrame } from './Plane'
import { quadratic } from './math'

const poly = (b: number, c: number) => {
  const parts = ['z^2']
  if (b !== 0) parts.push(`${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}z`)
  if (c !== 0) parts.push(`${c < 0 ? '-' : '+'} ${Math.abs(c)}`)
  return `${parts.join(' ')} = 0`
}
const paren = (x: number) => (x < 0 ? `(${x})` : `${x}`)

/** z² + bz + c = 0: the sign of Δ decides between two real roots, a double root, or conjugate complex roots. */
export function QuadraticWidget() {
  const [b, setB] = useState(2)
  const [c, setC] = useState(5)
  const q = quadratic(b, c)
  const [r1, r2] = q.roots
  const verdict =
    q.delta > 0 ? 'Δ > 0 : deux solutions réelles distinctes.'
    : q.delta === 0 ? 'Δ = 0 : une solution réelle double.'
    : 'Δ < 0 : deux solutions complexes conjuguées (symétriques par rapport à l’axe des abscisses).'

  const plane = (
    <Plane range={7} label="Plan complexe : solutions de l’équation du second degré">
      {q.delta < 0 && <Seg a={r1} b={r2} dashed color={COLORS.muted} width={1.4} />}
      <Dot z={r1} label="z₁" />
      {q.delta !== 0 && <Dot z={r2} label="z₂" color={COLORS.a} />}
    </Plane>
  )

  return (
    <WidgetFrame title="équation du second degré" instruction="Faites varier b et c dans z² + bz + c = 0 et regardez où se placent les solutions." onReset={() => { setB(2); setC(5) }} plane={plane}>
      <Slider label="b" value={b} min={-6} max={6} onChange={setB} />
      <Slider label="c" value={c} min={-6} max={10} onChange={setC} />
      <Line tex={poly(b, c)} />
      <Line tex={`\\Delta = b^2 - 4ac = ${paren(b)}^2 - 4 \\times 1 \\times ${paren(c)} = ${q.delta}`} />
      <p className="text-muted">{verdict}</p>
      <Line tex={q.tex} />
    </WidgetFrame>
  )
}
