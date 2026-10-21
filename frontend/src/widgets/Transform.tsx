import { useState } from 'react'
import { Arc, COLORS, Dot, DraggablePoint, Line, Plane, Seg, Slider, WidgetFrame } from './Plane'
import { abs, add, arg, complexTex, exactTrig, mul, piTex, plainPi, scale, sub, type C } from './math'

type Mode = 'translation' | 'homothety' | 'rotation'
const LABELS: Record<Mode, string> = { translation: 'Translation', homothety: 'Homothétie', rotation: 'Rotation' }
const RANGE = 6

const paren = (z: C) => {
  const t = complexTex(z)
  return t.includes(' ') || t.startsWith('-') ? `(${t})` : t
}

/** Image of M by a translation, a homothety or a rotation, in complex notation. */
export function TransformWidget({ config }: { config: { mode?: Mode } }) {
  const [mode, setMode] = useState<Mode>(config.mode ?? 'rotation')
  const [m, setM] = useState<C>({ re: 2, im: 1 })
  const [omega, setOmega] = useState<C>({ re: -1, im: -1 })
  const [bRe, setBRe] = useState(2)
  const [bIm, setBIm] = useState(1)
  const [k, setK] = useState(2)
  const [angle, setAngle] = useState(6) // θ = angle·π/12

  const b: C = { re: bRe, im: bIm }
  const t = exactTrig(angle)
  const rot: C = { re: t.cos, im: t.sin }
  const image = (z: C): C =>
    mode === 'translation' ? add(z, b)
    : mode === 'homothety' ? add(omega, scale(k, sub(z, omega)))
    : add(omega, mul(rot, sub(z, omega)))
  const mp = image(m)
  const out = Math.abs(mp.re) > RANGE || Math.abs(mp.im) > RANGE

  const plane = (
    <Plane range={RANGE} label="Plan complexe : un point et son image par la transformation">
      {mode !== 'translation' && (
        <>
          <Seg a={omega} b={m} dashed color={COLORS.muted} width={1.4} />
          <Seg a={omega} b={mp} dashed color={COLORS.b} width={1.4} />
        </>
      )}
      {mode === 'translation' && <Seg a={m} b={mp} arrow color={COLORS.b} />}
      {mode === 'rotation' && abs(sub(m, omega)) > 0 && (
        <Arc center={omega} r={Math.min(1, abs(sub(m, omega)) * 0.5)} from={arg(sub(m, omega))} to={arg(sub(m, omega)) + (angle * Math.PI) / 12} color={COLORS.b} />
      )}
      <Dot z={mp} label="M′" color={COLORS.b} shape="diamond" />
      {mode !== 'translation' && <DraggablePoint z={omega} onMove={setOmega} label="Ω" name="Centre oméga" color={COLORS.a} />}
      <DraggablePoint z={m} onMove={setM} label="M" name="Point M" />
    </Plane>
  )

  const formula =
    mode === 'translation' ? `z' = z + b = ${complexTex(m)} + ${paren(b)}`
    : mode === 'homothety' ? `z' - \\omega = k\\,(z - \\omega) \\;\\Rightarrow\\; z' = ${paren(omega)} + ${k < 0 ? `(${k})` : k}\\,\\big(${complexTex(m)} - ${paren(omega)}\\big)`
    : `z' - \\omega = e^{i\\theta}(z - \\omega) \\;\\Rightarrow\\; z' = ${paren(omega)} + e^{i\\,${piTex(angle)}}\\,\\big(${complexTex(m)} - ${paren(omega)}\\big)`

  return (
    <WidgetFrame title="transformations du plan" instruction="Choisissez une transformation, déplacez M (et Ω) et réglez les paramètres : M′ est l’image de M."
      onReset={() => { setM({ re: 2, im: 1 }); setOmega({ re: -1, im: -1 }); setBRe(2); setBIm(1); setK(2); setAngle(6) }} plane={plane}>
      <fieldset className="mb-2 flex flex-wrap gap-4">
        <legend className="sr-only">Transformation</legend>
        {(Object.keys(LABELS) as Mode[]).map((key) => (
          <label key={key} className="inline-flex items-center gap-2">
            <input type="radio" name="transform-mode" checked={mode === key} onChange={() => setMode(key)} className="accent-[var(--brand)]" />
            {LABELS[key]}
          </label>
        ))}
      </fieldset>
      {mode === 'translation' && (
        <>
          <Slider label="Re(b)" value={bRe} min={-4} max={4} onChange={setBRe} />
          <Slider label="Im(b)" value={bIm} min={-4} max={4} onChange={setBIm} />
        </>
      )}
      {mode === 'homothety' && <Slider label="Rapport k" value={k} min={-3} max={3} step={0.5} onChange={setK} valueText={String(k).replace('.', ',')} />}
      {mode === 'rotation' && <Slider label="Angle θ" value={angle} min={-12} max={12} onChange={setAngle} valueText={plainPi(angle)} />}
      <Line tex={formula} />
      <Line tex={`z' = ${complexTex(mp)}`} />
      {out && <p className="text-muted">M′ est en dehors du cadre affiché.</p>}
      {mode === 'rotation' && <p className="text-muted">Une rotation conserve les distances : ΩM′ = ΩM.</p>}
      {mode === 'homothety' && <p className="text-muted">ΩM′ = |k| × ΩM, et M′ est sur la droite (ΩM).</p>}
    </WidgetFrame>
  )
}
