import { useState } from 'react'
import { Arc, COLORS, Dot, DraggablePoint, Line, O, Plane, Ring, Seg, Toggle, WidgetFrame } from './Plane'
import { abs, arg, argTex, complexTex, conj, degTex, modulusTex, neg, numTex, type C } from './math'

export interface ArgandConfig {
  z?: C
  conjugate?: boolean
  opposite?: boolean
  modulus?: boolean
  polar?: boolean
}

/** Drag z in the complex plane: Re/Im, conjugate, opposite, modulus and argument update live. */
export function ArgandWidget({ config }: { config: ArgandConfig }) {
  const initial = config.z ?? { re: 2, im: 1.5 }
  const [z, setZ] = useState<C>(initial)
  const [show, setShow] = useState({
    conjugate: !!config.conjugate, opposite: !!config.opposite, modulus: !!config.modulus, polar: !!config.polar,
  })
  const toggle = (k: keyof typeof show) => (v: boolean) => setShow({ ...show, [k]: v })

  const r = abs(z)
  const zero = r === 0
  const theta = arg(z)
  const modTex = modulusTex(z)
  const radical = modTex.includes('\\sqrt') || modTex.startsWith('\\approx')

  const plane = (
    <Plane label="Plan complexe : le point z peut être déplacé">
      {show.modulus && <Ring r={r} />}
      {show.polar && !zero && (
        <>
          <Seg a={z} b={{ re: z.re, im: 0 }} dashed color={COLORS.muted} width={1.4} />
          <Seg a={z} b={{ re: 0, im: z.im }} dashed color={COLORS.muted} width={1.4} />
          <Arc r={Math.min(0.9, r * 0.6)} from={0} to={theta} />
        </>
      )}
      <Seg a={O} b={z} arrow />
      {show.conjugate && (
        <>
          <Seg a={z} b={conj(z)} dashed color={COLORS.a} width={1.4} />
          <Dot z={conj(z)} label="z̄" color={COLORS.a} shape="diamond" />
        </>
      )}
      {show.opposite && (
        <>
          <Seg a={z} b={neg(z)} dashed color={COLORS.b} width={1.4} />
          <Dot z={neg(z)} label="−z" color={COLORS.b} shape="diamond" />
        </>
      )}
      <DraggablePoint z={z} onMove={setZ} label="z" name="Point z" />
    </Plane>
  )

  return (
    <WidgetFrame title="le plan complexe" instruction="Déplacez le point z (souris, doigt ou flèches du clavier) et observez les valeurs." onReset={() => setZ(initial)} plane={plane}>
      <div className="mb-2">
        {config.conjugate && <Toggle checked={show.conjugate} onChange={toggle('conjugate')} label="Conjugué" />}
        {config.opposite && <Toggle checked={show.opposite} onChange={toggle('opposite')} label="Opposé" />}
        {config.modulus && <Toggle checked={show.modulus} onChange={toggle('modulus')} label="Module" />}
        {config.polar && <Toggle checked={show.polar} onChange={toggle('polar')} label="Argument" />}
      </div>
      <Line tex={`z = ${complexTex(z)}`} />
      <Line tex={`\\operatorname{Re}(z) = ${numTex(z.re)} \\qquad \\operatorname{Im}(z) = ${numTex(z.im)}`} />
      {show.conjugate && <Line tex={`\\overline{z} = ${complexTex(conj(z))}`} />}
      {show.opposite && <Line tex={`-z = ${complexTex(neg(z))}`} />}
      {(show.modulus || show.polar) && (
        <Line tex={`|z| = ${modTex}${radical && !modTex.startsWith('\\approx') ? `\\approx ${numTex(r)}` : ''}`.replace('\\approx \\approx', '\\approx')} />
      )}
      {show.polar && (
        <>
          <Line tex={`\\arg z \\equiv ${argTex(z)} \\;[2\\pi]${zero ? '' : ` \\quad(${degTex(theta)})`}`} />
          {!zero && <Line tex={`z = |z|\\,(\\cos\\theta + i\\sin\\theta) \\quad\\text{avec } \\theta = \\arg z`} />}
        </>
      )}
    </WidgetFrame>
  )
}
