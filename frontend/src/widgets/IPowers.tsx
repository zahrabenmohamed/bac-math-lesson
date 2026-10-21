import { useState } from 'react'
import { COLORS, Dot, Line, O, Plane, Seg, Slider, Tag, WidgetFrame } from './Plane'

const VALUES = [
  { z: { re: 1, im: 0 }, tex: '1' },
  { z: { re: 0, im: 1 }, tex: 'i' },
  { z: { re: -1, im: 0 }, tex: '-1' },
  { z: { re: 0, im: -1 }, tex: '-i' },
]

/** i^n only takes four values: 1, i, −1, −i, repeating with period 4. */
export function IPowersWidget() {
  const [n, setN] = useState(7)
  const q = Math.floor(n / 4)
  const r = n % 4
  const plane = (
    <Plane range={2} snap={1} label="Les quatre valeurs possibles de i puissance n">
      {VALUES.map((v, i) => (
        <Dot key={i} z={v.z} color={i === r ? COLORS.brand : COLORS.muted} label={`i^${i}`} />
      ))}
      <Seg a={O} b={VALUES[r].z} arrow />
      <Tag at={VALUES[r].z} text={`i^${n}`} color={COLORS.brand} dx={0.1} dy={0.62} />
    </Plane>
  )
  return (
    <WidgetFrame title="puissances de i" instruction="Faites varier n : les puissances de i se répètent par période de 4." onReset={() => setN(7)} plane={plane}>
      <Slider label="Exposant n" value={n} min={0} max={20} onChange={setN} />
      <Line tex={`n = 4 \\times ${q} + ${r}`} />
      <Line tex={`i^{${n}} = (i^4)^{${q}} \\times i^{${r}} = 1^{${q}} \\times i^{${r}} = ${VALUES[r].tex}`} />
      <p className="text-muted">On divise n par 4 et on garde le reste r : i<sup>n</sup> = i<sup>r</sup>.</p>
    </WidgetFrame>
  )
}
