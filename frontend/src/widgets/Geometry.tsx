import { useState } from 'react'
import { COLORS, Dot, DraggablePoint, Line, Plane, Seg, WidgetFrame } from './Plane'
import { abs, add, complexTex, div, modulusTex, numTex, scale, sub, type C } from './math'

/** Vector AB, its affix z_B − z_A, the midpoint and the distance AB. */
export function SegmentWidget() {
  const initA: C = { re: -2, im: 1 }
  const initB: C = { re: 1, im: 3 }
  const [a, setA] = useState(initA)
  const [b, setB] = useState(initB)
  const v = sub(b, a)
  const mid = scale(0.5, add(a, b))
  const len = abs(v)
  const modTex = modulusTex(v)
  const plane = (
    <Plane label="Plan complexe : deux points A et B">
      <Seg a={a} b={b} arrow color={COLORS.b} />
      <Dot z={mid} label="I" color={COLORS.a} shape="diamond" />
      <DraggablePoint z={a} onMove={setA} label="A" name="Point A" />
      <DraggablePoint z={b} onMove={setB} label="B" name="Point B" />
    </Plane>
  )
  return (
    <WidgetFrame title="vecteur, milieu, distance" instruction="Déplacez A et B : l’affixe de AB, le milieu I et la distance AB sont recalculés." onReset={() => { setA(initA); setB(initB) }} plane={plane}>
      <Line tex={`z_A = ${complexTex(a)} \\qquad z_B = ${complexTex(b)}`} />
      <Line tex={`z_{\\overrightarrow{AB}} = z_B - z_A = ${complexTex(v)}`} />
      <Line tex={`z_I = \\dfrac{z_A + z_B}{2} = ${complexTex(mid)}`} />
      <Line tex={`AB = |z_B - z_A| = ${modTex}${modTex.includes('\\sqrt') ? ` \\approx ${numTex(len)}` : ''}`} />
    </WidgetFrame>
  )
}

/** The quotient Q = (z_C − z_A)/(z_B − z_A) tells whether A, B, C are aligned or AB ⟂ AC. */
export function AlignmentWidget() {
  const initA: C = { re: 0, im: 0 }
  const initB: C = { re: 1, im: 1 }
  const initC: C = { re: -1, im: 1 }
  const [a, setA] = useState(initA)
  const [b, setB] = useState(initB)
  const [cc, setC] = useState(initC)

  const ab = sub(b, a)
  const ac = sub(cc, a)
  const degenerate = abs(ab) === 0 || abs(ac) === 0
  const q = degenerate ? null : div(ac, ab)

  const aligned = q !== null && Math.abs(q.im) < 1e-9
  const perpendicular = q !== null && Math.abs(q.re) < 1e-9
  const equalLengths = q !== null && Math.abs(abs(q) - 1) < 1e-9

  const plane = (
    <Plane label="Plan complexe : trois points A, B et C">
      <Seg a={a} b={b} color={COLORS.brand} />
      <Seg a={a} b={cc} color={COLORS.a} />
      <Seg a={b} b={cc} color={COLORS.muted} dashed width={1.4} />
      <DraggablePoint z={a} onMove={setA} label="A" name="Point A" />
      <DraggablePoint z={b} onMove={setB} label="B" name="Point B" color={COLORS.brand} />
      <DraggablePoint z={cc} onMove={setC} label="C" name="Point C" color={COLORS.a} />
    </Plane>
  )

  const verdict = (ok: boolean, yes: string, no: string) => (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={ok ? 'text-correct' : 'text-muted'}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? '' : 'text-muted'}>{ok ? yes : no}</span>
    </li>
  )

  return (
    <WidgetFrame title="alignement et orthogonalité" instruction="Déplacez A, B et C. Le quotient Q indique s’ils sont alignés ou si (AB) ⟂ (AC)." onReset={() => { setA(initA); setB(initB); setC(initC) }} plane={plane}>
      <Line tex={`z_B - z_A = ${complexTex(ab)} \\qquad z_C - z_A = ${complexTex(ac)}`} />
      {q === null ? (
        <p className="text-muted">Deux des points sont confondus : le quotient n’est pas défini.</p>
      ) : (
        <>
          <Line tex={`Q = \\dfrac{z_C - z_A}{z_B - z_A} = ${complexTex(q)}`} />
          <Line tex={`|Q| = \\dfrac{AC}{AB} = ${modulusTex(q)}`} />
          <ul className="space-y-1">
            {verdict(aligned, 'Q est réel : A, B et C sont alignés.', 'Q n’est pas réel : A, B et C ne sont pas alignés.')}
            {verdict(perpendicular, 'Q est imaginaire pur : (AB) ⟂ (AC).', 'Q n’est pas imaginaire pur : (AB) et (AC) ne sont pas perpendiculaires.')}
            {verdict(equalLengths, '|Q| = 1 : AB = AC.', '|Q| ≠ 1 : AB ≠ AC.')}
          </ul>
        </>
      )}
    </WidgetFrame>
  )
}
