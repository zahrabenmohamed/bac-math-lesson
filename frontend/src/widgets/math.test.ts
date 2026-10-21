import { describe, expect, it } from 'vitest'
import {
  abs, angleTex, arg, argTex, complexTex, conj, div, exactTrig, expTex, fraction, modulusTex, mul, normalizeAngle,
  numTex, quadratic, simplifyRadical,
} from './math'

describe('complexTex', () => {
  it.each([
    [{ re: 3, im: 4 }, '3 + 4i'],
    [{ re: 3, im: -2 }, '3 - 2i'],
    [{ re: 0, im: 1 }, 'i'],
    [{ re: 0, im: -1 }, '-i'],
    [{ re: 2, im: 0 }, '2'],
    [{ re: 0, im: 0 }, '0'],
    [{ re: -1, im: 1 }, '-1 + i'],
    [{ re: 1.5, im: -0.5 }, '\\frac{3}{2} - \\frac{1}{2}i'],
    [{ re: 0.2, im: 1.4 }, '\\frac{1}{5} + \\frac{7}{5}i'],
  ])('%j -> %s', (z, tex) => expect(complexTex(z)).toBe(tex))

  it('flags irrational parts as approximations with a decimal comma', () => {
    expect(complexTex({ re: 1, im: Math.sqrt(3) })).toBe('\\approx 1 + 1{,}73i')
  })

  it('never prints negative zero', () => {
    expect(complexTex({ re: -0, im: 1e-15 })).toBe('0')
  })
})

describe('modulusTex', () => {
  it.each([
    [{ re: 3, im: 4 }, '5'],
    [{ re: 1, im: 1 }, '\\sqrt{2}'],
    [{ re: 0.5, im: 0.5 }, '\\frac{\\sqrt{2}}{2}'],
    [{ re: 1.5, im: 2 }, '\\frac{5}{2}'],
    [{ re: 2, im: 1 }, '\\sqrt{5}'],
    [{ re: 2, im: 2 }, '2\\sqrt{2}'],
    [{ re: 0, im: 0 }, '0'],
    [{ re: -5, im: 12 }, '13'],
    [{ re: 1, im: 0.5 }, '\\frac{\\sqrt{5}}{2}'],
  ])('%j -> %s', (z, tex) => expect(modulusTex(z)).toBe(tex))

  it('is consistent with the numeric modulus', () => {
    for (let a = -4; a <= 4; a += 0.5) {
      for (let b = -4; b <= 4; b += 0.5) {
        const tex = modulusTex({ re: a, im: b })
        expect(tex.startsWith('\\approx')).toBe(false) // multiples of 1/2 are always exact
        const m = simplifyRadical(Math.round((a * a + b * b) * 16))
        expect((m[0] * Math.sqrt(m[1])) / 4).toBeCloseTo(Math.hypot(a, b), 9)
      }
    }
  })
})

describe('arguments', () => {
  it.each([
    [{ re: 1, im: 1 }, '\\frac{\\pi}{4}'],
    [{ re: -1, im: 0 }, '\\pi'],
    [{ re: 0, im: -1 }, '-\\frac{\\pi}{2}'],
    [{ re: -1, im: 1 }, '\\frac{3\\pi}{4}'],
    [{ re: 1, im: 0 }, '0'],
    [{ re: 1, im: -1 }, '-\\frac{\\pi}{4}'],
    [{ re: -1, im: -1 }, '-\\frac{3\\pi}{4}'],
    [{ re: 2, im: 0 }, '0'],
  ])('arg %j = %s', (z, tex) => expect(argTex(z)).toBe(tex))

  it('keeps the principal value in ]-π, π] (π, never -π)', () => {
    expect(arg({ re: -2, im: -0 })).toBeCloseTo(Math.PI, 12)
    expect(arg({ re: -2, im: 0 })).toBeCloseTo(Math.PI, 12)
  })

  it('gives an approximation for non-notable arguments and none for 0', () => {
    expect(argTex({ re: 2, im: 1 })).toBe('\\approx 0{,}46')
    expect(argTex({ re: 0, im: 0 })).toContain('non défini')
  })

  it('normalizes angles into ]-π, π]', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 12)
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI, 12)
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 12)
    expect(angleTex(normalizeAngle((7 * Math.PI) / 3))).toBe('\\frac{\\pi}{3}')
  })
})

describe('exact trigonometry', () => {
  it('matches Math.cos / Math.sin for every multiple of π/12', () => {
    for (let k = -24; k <= 24; k++) {
      const t = exactTrig(k)
      expect(t.cos).toBeCloseTo(Math.cos((k * Math.PI) / 12), 12)
      expect(t.sin).toBeCloseTo(Math.sin((k * Math.PI) / 12), 12)
    }
  })

  it('gives the classical exact values', () => {
    expect(exactTrig(2)).toMatchObject({ cosTex: '\\frac{\\sqrt{3}}{2}', sinTex: '\\frac{1}{2}' })
    expect(exactTrig(3)).toMatchObject({ cosTex: '\\frac{\\sqrt{2}}{2}', sinTex: '\\frac{\\sqrt{2}}{2}' })
    expect(exactTrig(9)).toMatchObject({ cosTex: '-\\frac{\\sqrt{2}}{2}', sinTex: '\\frac{\\sqrt{2}}{2}' })
    expect(exactTrig(12)).toMatchObject({ cosTex: '-1', sinTex: '0' })
    expect(exactTrig(-6)).toMatchObject({ cosTex: '0', sinTex: '-1' })
    expect(exactTrig(8)).toMatchObject({ cosTex: '-\\frac{1}{2}', sinTex: '\\frac{\\sqrt{3}}{2}' })
  })

  it('has no exact form for π/12 and 5π/12', () => {
    expect(exactTrig(1).cosTex).toBeNull()
    expect(exactTrig(5).sinTex).toBeNull()
  })

  it('writes e^{iθ} in algebraic form', () => {
    expect(expTex(0)).toBe('1')
    expect(expTex(6)).toBe('i')
    expect(expTex(12)).toBe('-1')
    expect(expTex(-6)).toBe('-i')
    expect(expTex(4)).toBe('\\frac{1}{2} + \\frac{\\sqrt{3}}{2}\\,i')
    expect(expTex(-3)).toBe('\\frac{\\sqrt{2}}{2} - \\frac{\\sqrt{2}}{2}\\,i')
    expect(expTex(1).startsWith('\\approx')).toBe(true)
  })
})

describe('quadratic z² + bz + c', () => {
  it.each([
    [2, 5, -16, 'z = -1 \\pm 2i'],
    [0, 1, -4, 'z = \\pm i'],
    [1, 1, -3, 'z = \\frac{-1 \\pm \\sqrt{3}\\,i}{2}'],
    [-4, 1, 12, 'z = 2 \\pm \\sqrt{3}'],
    [-2, 1, 0, 'z = 1'],
    [-3, 2, 1, 'z_1 = 1, \\; z_2 = 2'],
    [0, -2, 8, 'z = \\pm \\sqrt{2}'],
    [-2, 2, -4, 'z = 1 \\pm i'],
    [0, 3, -12, 'z = \\pm \\sqrt{3}\\,i'],
  ])('b=%i c=%i -> delta %i, %s', (b, cc, delta, tex) => {
    const q = quadratic(b, cc)
    expect(q.delta).toBe(delta)
    expect(q.tex).toBe(tex)
  })

  it('numeric roots really solve the equation', () => {
    for (let b = -6; b <= 6; b++) {
      for (let cc = -6; cc <= 10; cc++) {
        for (const z of quadratic(b, cc).roots) {
          const v = mul(z, z)
          expect(v.re + b * z.re + cc).toBeCloseTo(0, 9)
          expect(v.im + b * z.im).toBeCloseTo(0, 9)
        }
      }
    }
  })
})

describe('arithmetic and formatting helpers', () => {
  it('|zz\'| = |z||z\'| and arg adds up', () => {
    const z = { re: 1.5, im: -0.5 }
    const w = { re: -1, im: 2 }
    expect(abs(mul(z, w))).toBeCloseTo(abs(z) * abs(w), 12)
    expect(normalizeAngle(arg(z) + arg(w))).toBeCloseTo(arg(mul(z, w)), 12)
  })

  it('division by the conjugate yields |z|²', () => {
    const z = { re: 3, im: 4 }
    expect(mul(z, conj(z))).toEqual({ re: 25, im: 0 })
    const q = div({ re: 2, im: 1 }, { re: 1, im: -1 })
    expect(q.re).toBeCloseTo(0.5, 12)
    expect(q.im).toBeCloseTo(1.5, 12)
  })

  it('fractions and numbers', () => {
    expect(fraction(0.5)).toEqual([1, 2])
    expect(fraction(-0.75)).toEqual([-3, 4])
    expect(fraction(Math.PI)).toBeNull()
    expect(numTex(2.236)).toBe('2{,}24')
    expect(numTex(-1.5)).toBe('-\\frac{3}{2}')
  })
})
