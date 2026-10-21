// Exact complex-number helpers for the interactive widgets: values are shown as fractions, radicals and
// multiples of π whenever they are exact, and flagged "≈" otherwise. Output strings are KaTeX.

export interface C {
  re: number
  im: number
}

export const c = (re: number, im = 0): C => ({ re, im })
export const add = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
export const sub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
export const mul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
export const conj = (a: C): C => ({ re: a.re, im: -a.im })
export const neg = (a: C): C => ({ re: -a.re, im: -a.im })
export const scale = (k: number, a: C): C => ({ re: k * a.re, im: k * a.im })
export const abs = (a: C): number => Math.hypot(a.re, a.im)
export const fromPolar = (r: number, theta: number): C => ({ re: r * Math.cos(theta), im: r * Math.sin(theta) })

export function div(a: C, b: C): C {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

const EPS = 1e-9
const clean = (x: number) => (Math.abs(x) < EPS ? 0 : x)

/** Argument in ]-π, π]; undefined for 0. */
export function arg(a: C): number {
  return Math.atan2(clean(a.im), clean(a.re)) === -Math.PI ? Math.PI : Math.atan2(clean(a.im), clean(a.re))
}

/** Brings an angle into ]-π, π]. */
export function normalizeAngle(t: number): number {
  const twoPi = 2 * Math.PI
  let r = t % twoPi
  if (r > Math.PI + EPS) r -= twoPi
  if (r <= -Math.PI + EPS) r += twoPi
  return r
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a
}

/** x as a reduced fraction [numerator, denominator] when it is one (denominator <= maxDen), else null. */
export function fraction(x: number, maxDen = 20): [number, number] | null {
  for (let d = 1; d <= maxDen; d++) {
    const n = x * d
    const r = Math.round(n)
    if (Math.abs(n - r) < EPS * d) {
      const g = gcd(r, d) || 1
      return [r / g, d / g]
    }
  }
  return null
}

export function fracTex(x: number): string | null {
  const f = fraction(x)
  if (!f) return null
  const [n, d] = f
  if (d === 1) return `${n}`
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`
}

const decimalTex = (x: number) => clean(x).toFixed(2).replace('.', '{,}')

/** Exact when possible, otherwise a 2-decimal approximation. */
export const numTex = (x: number): string => fracTex(x) ?? decimalTex(x)

export const isExact = (z: C) => fraction(z.re) !== null && fraction(z.im) !== null

/** a + bi in KaTeX; prefixed with \approx when a part is not a simple fraction. */
export function complexTex(z: C): string {
  const exact = isExact(z)
  const re = clean(z.re)
  const im = clean(z.im)
  const prefix = exact ? '' : '\\approx '
  if (re === 0 && im === 0) return '0'
  if (im === 0) return prefix + numTex(re)
  const coef = Math.abs(im) === 1 ? '' : numTex(Math.abs(im))
  if (re === 0) return `${prefix}${im < 0 ? '-' : ''}${coef}i`
  return `${prefix}${numTex(re)} ${im < 0 ? '-' : '+'} ${coef}i`
}

/** n = m² r with r square-free: returns [m, r] so that √n = m√r. */
export function simplifyRadical(n: number): [number, number] {
  for (let k = Math.floor(Math.sqrt(n)); k >= 2; k--) {
    if (n % (k * k) === 0) return [k, n / (k * k)]
  }
  return [1, n]
}

/** |z| exactly (e.g. 5, \sqrt{2}, \frac{\sqrt{5}}{2}) when the parts are multiples of 1/4, else ≈. */
export function modulusTex(z: C): string {
  const s = z.re * z.re + z.im * z.im
  const t = s * 16
  const N = Math.round(t)
  if (Math.abs(t - N) > 1e-7) return `\\approx ${numTex(Math.sqrt(s))}`
  if (N === 0) return '0'
  const [m, r] = simplifyRadical(N) // |z| = m√r / 4
  const g = gcd(m, 4)
  const num = m / g
  const den = 4 / g
  if (r === 1) return den === 1 ? `${num}` : `\\frac{${num}}{${den}}`
  const rad = `${num === 1 ? '' : num}\\sqrt{${r}}`
  return den === 1 ? rad : `\\frac{${rad}}{${den}}`
}

export const modulusIsRadical = (z: C) => modulusTex(z).includes('\\sqrt') || modulusTex(z).startsWith('\\approx')

/** k·π/12 as a reduced multiple of π. */
export function piTex(k: number): string {
  if (k === 0) return '0'
  const g = gcd(k, 12)
  const num = k / g
  const den = 12 / g
  const sign = num < 0 ? '-' : ''
  const top = Math.abs(num) === 1 ? '\\pi' : `${Math.abs(num)}\\pi`
  return den === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${den}}`
}

/** An angle in radians: exact multiple of π/12 when it is one, else ≈. */
export function angleTex(theta: number): string {
  const k = theta / (Math.PI / 12)
  if (Math.abs(k - Math.round(k)) < 1e-9) return piTex(Math.round(k))
  return `\\approx ${numTex(theta)}`
}

export const degTex = (theta: number) => `${decimalTex((theta * 180) / Math.PI).replace('{,}00', '')}^\\circ`

export function argTex(z: C): string {
  return abs(z) < EPS ? '\\text{non défini}' : angleTex(arg(z))
}

// ---- exact trigonometry for multiples of π/12 ----

// reference angle (in twelfths of π) -> [cos, sin] as KaTeX; only π/6, π/4, π/3 and the axes are "nice".
const NICE: Record<number, [string, string]> = {
  0: ['1', '0'],
  2: ['\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}'],
  3: ['\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{2}}{2}'],
  4: ['\\frac{1}{2}', '\\frac{\\sqrt{3}}{2}'],
  6: ['0', '1'],
}

const signed = (sign: number, tex: string) => (tex === '0' || sign > 0 ? tex : `-${tex}`)

/** cos and sin of k·π/12 (numeric), with exact KaTeX when k is a multiple of π/6 or π/4. */
export function exactTrig(k: number): { cos: number; sin: number; cosTex: string | null; sinTex: string | null } {
  const q = ((k % 24) + 24) % 24
  const cos = clean(Math.cos((k * Math.PI) / 12))
  const sin = clean(Math.sin((k * Math.PI) / 12))
  let ref: number
  let sc: number
  let ss: number
  if (q <= 6) { ref = q; sc = 1; ss = 1 }
  else if (q <= 12) { ref = 12 - q; sc = -1; ss = 1 }
  else if (q <= 18) { ref = q - 12; sc = -1; ss = -1 }
  else { ref = 24 - q; sc = 1; ss = -1 }
  const nice = NICE[ref]
  return nice
    ? { cos, sin, cosTex: signed(sc, nice[0]), sinTex: signed(ss, nice[1]) }
    : { cos, sin, cosTex: null, sinTex: null }
}

/** e^{iθ} = cos θ + i sin θ for θ = k·π/12, exact when possible. */
export function expTex(k: number): string {
  const t = exactTrig(k)
  if (t.cosTex === null || t.sinTex === null) return complexTex({ re: t.cos, im: t.sin })
  const { cosTex, sinTex } = t
  if (sinTex === '0') return cosTex
  const imag = sinTex.startsWith('-') ? sinTex.slice(1) : sinTex
  const coef = imag === '1' ? '' : `${imag}\\,`
  const sign = sinTex.startsWith('-') ? '-' : '+'
  if (cosTex === '0') return `${sign === '-' ? '-' : ''}${coef}i`
  return `${cosTex} ${sign} ${coef}i`
}

// ---- quadratic z² + bz + c = 0 (a = 1, integer b and c) ----

export interface QuadraticResult {
  delta: number
  roots: [C, C]
  tex: string
}

export function quadratic(b: number, c: number): QuadraticResult {
  const delta = b * b - 4 * c
  const sq = Math.sqrt(Math.abs(delta))
  const roots: [C, C] =
    delta >= 0
      ? [{ re: (-b - sq) / 2, im: 0 }, { re: (-b + sq) / 2, im: 0 }]
      : [{ re: -b / 2, im: sq / 2 }, { re: -b / 2, im: -sq / 2 }]

  if (delta === 0) return { delta, roots, tex: `z = ${numTex(-b / 2)}` }

  const [m, r] = simplifyRadical(Math.abs(delta))
  const imag = delta < 0
  if (r === 1) {
    // rational roots (real) or (re ± (m/2) i)
    if (!imag) return { delta, roots, tex: `z_1 = ${numTex((-b - m) / 2)}, \\; z_2 = ${numTex((-b + m) / 2)}` }
    const coef = m === 2 ? '' : numTex(m / 2)
    const re = -b === 0 ? '' : `${numTex(-b / 2)} `
    return { delta, roots, tex: `z = ${re}\\pm ${coef}i`.replace('z = \\pm', 'z = \\pm') }
  }
  let B = -b
  let M = m
  const g = B === 0 ? (M % 2 === 0 ? 2 : 1) : gcd(gcd(B, M), 2)
  B /= g
  M /= g
  const den = 2 / g
  const rad = `${M === 1 ? '' : M}\\sqrt{${r}}${imag ? '\\,i' : ''}`
  const top = B === 0 ? `\\pm ${rad}` : `${B} \\pm ${rad}`
  return { delta, roots, tex: `z = ${den === 1 ? top : `\\frac{${top}}{${den}}`}` }
}

/** k·π/12 as plain text for accessible names, e.g. "5π/6", "-π/2", "0". */
export function plainPi(k: number): string {
  if (k === 0) return '0'
  const g = gcd(k, 12)
  const num = k / g
  const den = 12 / g
  const top = Math.abs(num) === 1 ? 'π' : `${Math.abs(num)}π`
  return `${num < 0 ? '-' : ''}${top}${den === 1 ? '' : `/${den}`}`
}
