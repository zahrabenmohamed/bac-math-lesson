import { useState } from 'react'
import { Arc, COLORS, Dot, Line, O, Plane, Ring, Seg, Slider, Tag, WidgetFrame } from './Plane'
import { angleTex, exactTrig, expTex, numTex, piTex, plainPi } from './math'

export interface UnitCircleConfig {
  mode?: 'euler' | 'moivre'
}

/** e^{iθ} on the unit circle (θ in steps of π/12); in Moivre mode also the powers (e^{iθ})^n. */
export function UnitCircleWidget({ config }: { config: UnitCircleConfig }) {
  const moivre = config.mode === 'moivre'
  const initK = moivre ? 2 : 3
  const [k, setK] = useState(initK) // θ = kπ/12, k in -11..12
  const [n, setN] = useState(moivre ? 3 : 1)

  const theta = (k * Math.PI) / 12
  const t = exactTrig(k)
  const P = { re: t.cos, im: t.sin }
  // nθ brought back into ]-π, π]: index in twelfths of π
  let kn = (((n * k) % 24) + 24) % 24
  if (kn > 12) kn -= 24
  const tn = exactTrig(kn)
  const Pn = { re: tn.cos, im: tn.sin }

  const powers = moivre ? Array.from({ length: n }, (_, i) => exactTrig((i + 1) * k)) : []

  const plane = (
    <Plane range={1.5} snap={0.25} label="Cercle trigonométrique">
      <Ring r={1} color={COLORS.muted} dashed={false} />
      {!moivre && (
        <>
          <Seg a={P} b={{ re: P.re, im: 0 }} dashed color={COLORS.a} width={1.6} />
          <Seg a={P} b={{ re: 0, im: P.im }} dashed color={COLORS.b} width={1.6} />
          <Tag at={{ re: P.re, im: 0 }} text="cos θ" color={COLORS.a} dy={P.im >= 0 ? 0.42 : -0.18} dx={-0.2} />
          <Tag at={{ re: 0, im: P.im }} text="sin θ" color={COLORS.b} dx={P.re >= 0 ? -0.9 : 0.15} />
        </>
      )}
      {moivre && powers.slice(0, -1).map((p, i) => <Dot key={i} z={{ re: p.cos, im: p.sin }} label={String(i + 1)} color={COLORS.muted} />)}
      <Arc r={0.3} from={0} to={theta} />
      {moivre && <Arc r={0.5} from={0} to={(n * k * Math.PI) / 12} color={COLORS.b} />}
      <Seg a={O} b={moivre ? Pn : P} arrow color={moivre ? COLORS.b : COLORS.brand} />
      <Dot z={P} label="P" color={COLORS.brand} />
      {moivre && n > 1 && <Dot z={Pn} label={`n=${n}`} color={COLORS.b} shape="diamond" />}
    </Plane>
  )

  return (
    <WidgetFrame
      title={moivre ? 'formule de Moivre' : 'notation exponentielle'}
      instruction={moivre ? 'Choisissez θ et n : le point d’exposant n est celui d’angle nθ (l’angle est multiplié par n).' : 'Faites varier θ : le point P d’angle θ parcourt le cercle de rayon 1.'}
      onReset={() => { setK(initK); setN(moivre ? 3 : 1) }}
      plane={plane}
    >
      <Slider label="Angle θ" value={k} min={-11} max={12} onChange={setK} valueText={plainPi(k)} />
      {moivre && <Slider label="Exposant n" value={n} min={1} max={12} onChange={setN} />}
      <Line tex={`\\theta = ${piTex(k)} \\;(\\approx ${numTex(theta)}\\text{ rad})`} />
      <Line tex={`e^{i\\theta} = \\cos\\theta + i\\sin\\theta = ${expTex(k)}`} />
      {t.cosTex === null && <p className="text-muted">Pour π/12 et 5π/12 (et leurs symétriques), les valeurs exactes sont plus longues : on affiche une valeur approchée.</p>}
      {!moivre && <Line tex={`|e^{i\\theta}| = 1`} />}
      {moivre && (
        <>
          <Line tex={`n\\theta = ${piTex(n * k)} \\equiv ${angleTex((kn * Math.PI) / 12)} \\;[2\\pi]`} />
          <Line tex={`\\left(e^{i\\theta}\\right)^{${n}} = e^{${n}i\\theta} = \\cos ${n}\\theta + i\\sin ${n}\\theta = ${expTex(kn)}`} />
          <Line tex={`\\cos ${n}\\theta \\approx ${numTex(Pn.re)} \\qquad \\sin ${n}\\theta \\approx ${numTex(Pn.im)}`} />
        </>
      )}
    </WidgetFrame>
  )
}
