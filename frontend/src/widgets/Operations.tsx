import { useState } from 'react'
import { Arc, COLORS, Dot, DraggablePoint, Line, O, Plane, Seg, WidgetFrame } from './Plane'
import { abs, add, angleTex, arg, argTex, complexTex, modulusTex, mul, normalizeAngle, numTex, type C } from './math'

export interface OperationsConfig {
  op?: 'add' | 'multiply'
}

const MAX = 2.4
const inside = (z: C) => abs(z) <= MAX + 1e-9

/** Two draggable numbers and their sum (triangle inequality) or product (|zz'| = |z||z'|, arg adds). */
export function OperationsWidget({ config }: { config: OperationsConfig }) {
  const op = config.op ?? 'add'
  const init1: C = op === 'add' ? { re: 2, im: 1 } : { re: 1, im: 1 }
  const init2: C = op === 'add' ? { re: -1, im: 1.5 } : { re: 1, im: 0.5 }
  const [z1, setZ1] = useState(init1)
  const [z2, setZ2] = useState(init2)
  const w = op === 'add' ? add(z1, z2) : mul(z1, z2)

  const plane = (
    <Plane range={op === 'add' ? 5 : 6} label={op === 'add' ? 'Plan complexe : somme de deux nombres' : 'Plan complexe : produit de deux nombres'}>
      {op === 'add' && (
        <>
          <Seg a={z1} b={w} dashed color={COLORS.muted} width={1.4} />
          <Seg a={z2} b={w} dashed color={COLORS.muted} width={1.4} />
        </>
      )}
      {op === 'multiply' && (
        <>
          {abs(z1) > 0 && <Arc r={0.8} from={0} to={arg(z1)} color={COLORS.brand} />}
          {abs(z2) > 0 && <Arc r={1.15} from={0} to={arg(z2)} color={COLORS.a} />}
          {abs(w) > 0 && <Arc r={1.5} from={0} to={arg(w)} color={COLORS.b} />}
        </>
      )}
      <Seg a={O} b={z1} arrow />
      <Seg a={O} b={z2} arrow color={COLORS.a} />
      <Seg a={O} b={w} arrow color={COLORS.b} />
      <Dot z={w} label={op === 'add' ? 'z₁+z₂' : 'z₁z₂'} color={COLORS.b} shape="diamond" />
      <DraggablePoint z={z1} onMove={setZ1} label="z₁" name="Point z un" accept={inside} />
      <DraggablePoint z={z2} onMove={setZ2} label="z₂" name="Point z deux" color={COLORS.a} accept={inside} />
    </Plane>
  )

  const reset = () => { setZ1(init1); setZ2(init2) }
  const m1 = abs(z1)
  const m2 = abs(z2)
  const mw = abs(w)

  if (op === 'add') {
    const equal = Math.abs(mw - (m1 + m2)) < 1e-9
    return (
      <WidgetFrame title="somme et inégalité triangulaire" instruction="Déplacez z₁ et z₂. Comparez la longueur de la diagonale z₁+z₂ à la somme des longueurs." onReset={reset} plane={plane}>
        <Line tex={`z_1 = ${complexTex(z1)} \\qquad z_2 = ${complexTex(z2)}`} />
        <Line tex={`z_1 + z_2 = ${complexTex(w)}`} />
        <Line tex={`|z_1| = ${modulusTex(z1)} \\qquad |z_2| = ${modulusTex(z2)} \\qquad |z_1+z_2| = ${modulusTex(w)}`} />
        <Line tex={`|z_1+z_2| \\approx ${numTex(mw)} \\;${equal ? '=' : '<'}\\; |z_1|+|z_2| \\approx ${numTex(m1 + m2)}`} />
        <p className="text-muted">
          {equal
            ? 'Égalité : O, z₁ et z₂ sont alignés dans le même sens.'
            : 'Inégalité stricte : |z₁+z₂| < |z₁|+|z₂| (elle devient une égalité quand z₁ et z₂ sont alignés dans le même sens).'}
        </p>
      </WidgetFrame>
    )
  }

  const zero = m1 === 0 || m2 === 0
  const sum = normalizeAngle(arg(z1) + arg(z2))
  return (
    <WidgetFrame title="produit : modules et arguments" instruction="Déplacez z₁ et z₂. Les modules se multiplient, les arguments s’additionnent." onReset={reset} plane={plane}>
      <Line tex={`z_1 = ${complexTex(z1)} \\qquad z_2 = ${complexTex(z2)}`} />
      <Line tex={`z_1 z_2 = ${complexTex(w)}`} />
      <Line tex={`|z_1| = ${modulusTex(z1)} \\qquad |z_2| = ${modulusTex(z2)} \\qquad |z_1 z_2| = ${modulusTex(w)}`} />
      <Line tex={`|z_1|\\,|z_2| \\approx ${numTex(m1)} \\times ${numTex(m2)} = ${numTex(m1 * m2)} \\approx |z_1 z_2|`} />
      {zero ? (
        <p className="text-muted">Un des deux nombres est nul : le produit est nul et n’a pas d’argument.</p>
      ) : (
        <>
          <Line tex={`\\arg z_1 = ${argTex(z1)} \\qquad \\arg z_2 = ${argTex(z2)}`} />
          <Line tex={`\\arg z_1 + \\arg z_2 \\equiv ${angleTex(sum)} \\qquad \\arg(z_1 z_2) \\equiv ${argTex(w)} \\;[2\\pi]`} />
        </>
      )}
    </WidgetFrame>
  )
}
