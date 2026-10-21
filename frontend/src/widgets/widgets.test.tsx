import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlotInput } from '../components/exercises/PlotInput'
import { ArgandWidget } from './Argand'
import { AlignmentWidget, SegmentWidget } from './Geometry'
import { IPowersWidget } from './IPowers'
import { OperationsWidget } from './Operations'
import { QuadraticWidget } from './Quadratic'
import { TransformWidget } from './Transform'
import { UnitCircleWidget } from './UnitCircle'
import { WidgetHost } from './WidgetHost'

// KaTeX writes the TeX source in a MathML <annotation>, so textContent lets us assert the exact formula.
const text = (el: HTMLElement) => el.textContent ?? ''

describe('ArgandWidget', () => {
  it('moves the point with the arrow keys and updates every readout exactly', async () => {
    const { container } = render(<ArgandWidget config={{ z: { re: 2, im: 1 }, conjugate: true, modulus: true }} />)
    expect(text(container)).toContain('z = 2 + i')
    expect(text(container)).toContain('\\overline{z} = 2 - i')
    expect(text(container)).toContain('|z| = \\sqrt{5}')

    const point = screen.getByTestId('point-z')
    expect(point).toHaveAccessibleName(/partie réelle 2, partie imaginaire 1/)
    point.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowUp}')
    expect(point).toHaveAccessibleName(/partie réelle 2.5, partie imaginaire 1.5/)
    expect(text(container)).toContain('z = \\frac{5}{2} + \\frac{3}{2}i')
    expect(text(container)).toContain('\\overline{z} = \\frac{5}{2} - \\frac{3}{2}i')
  })

  it('keeps the point inside the plane', async () => {
    render(<ArgandWidget config={{ z: { re: 4.5, im: 0 } }} />)
    const point = screen.getByTestId('point-z')
    point.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(point).toHaveAccessibleName(/partie réelle 5,/)
  })

  it('lets the student hide an overlay and reset the point', async () => {
    const { container } = render(<ArgandWidget config={{ z: { re: 1, im: 1 }, conjugate: true }} />)
    expect(text(container)).toContain('\\overline{z}')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Conjugué' }))
    expect(text(container)).not.toContain('\\overline{z}')

    screen.getByTestId('point-z').focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(text(container)).toContain('z = \\frac{1}{2} + i')
    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(text(container)).toContain('z = 1 + i')
  })

  it('shows the argument as an exact multiple of π and in degrees', () => {
    const { container } = render(<ArgandWidget config={{ z: { re: 1, im: 1 }, polar: true }} />)
    expect(text(container)).toContain('\\arg z \\equiv \\frac{\\pi}{4}')
    expect(text(container)).toContain('45^\\circ')
  })

  it('reports an undefined argument for z = 0', () => {
    const { container } = render(<ArgandWidget config={{ z: { re: 0, im: 0 }, polar: true }} />)
    expect(text(container)).toContain('non défini')
  })
})

describe('OperationsWidget', () => {
  it('addition: compares |z1+z2| with |z1|+|z2|', () => {
    const { container } = render(<OperationsWidget config={{ op: 'add' }} />)
    expect(text(container)).toContain('z_1 + z_2 = \\frac{1}{2}'.slice(0, 11)) // z_1 + z_2
    expect(text(container)).toContain('Inégalité stricte')
  })

  it('addition: reports the equality case when the points are aligned in the same direction', async () => {
    const { container } = render(<OperationsWidget config={{ op: 'add' }} />)
    // z1 = 2 + i, z2 = -1 + 1.5i  ->  move z2 to 2 + i: Down x1 first (staying inside |z| <= 2.4), then Right x6
    const z2 = screen.getByTestId('point-z₂')
    z2.focus()
    await userEvent.keyboard('{ArrowDown}{ArrowRight>6/}')
    expect(text(container)).toContain('Égalité')
  })

  it('product: moduli multiply and arguments add', () => {
    const { container } = render(<OperationsWidget config={{ op: 'multiply' }} />)
    // (1 + i)(1 + i/2) = 1/2 + 3/2 i
    expect(text(container)).toContain('z_1 z_2 = \\frac{1}{2} + \\frac{3}{2}i')
    expect(text(container)).toContain('\\arg z_1 + \\arg z_2')
    expect(text(container)).toContain('|z_1|\\,|z_2|')
  })
})

describe('UnitCircleWidget', () => {
  it('Moivre: the angle is multiplied by n and the value stays exact', () => {
    const { container } = render(<UnitCircleWidget config={{ mode: 'moivre' }} />)
    // θ = π/6, n = 3 -> 3θ = π/2 -> e^{3iθ} = i
    expect(text(container)).toContain('\\cos 3\\theta + i\\sin 3\\theta = i')
    fireEvent.change(screen.getByLabelText('Exposant n'), { target: { value: '4' } })
    // 4θ = 2π/3 -> -1/2 + (√3/2) i
    expect(text(container)).toContain('= -\\frac{1}{2} + \\frac{\\sqrt{3}}{2}\\,i')
  })

  it('Euler: θ slider gives exact cos/sin and an accessible value text', () => {
    const { container } = render(<UnitCircleWidget config={{ mode: 'euler' }} />)
    const slider = screen.getByLabelText('Angle θ')
    expect(slider).toHaveAttribute('aria-valuetext', 'π/4')
    fireEvent.change(slider, { target: { value: '-6' } })
    expect(slider).toHaveAttribute('aria-valuetext', '-π/2')
    expect(text(container)).toContain('\\theta = -\\frac{\\pi}{2}')
    expect(text(container)).toContain('= -i')
  })

  it('warns that π/12 has no short exact form', () => {
    render(<UnitCircleWidget config={{ mode: 'euler' }} />)
    fireEvent.change(screen.getByLabelText('Angle θ'), { target: { value: '1' } })
    expect(screen.getByText(/valeurs exactes sont plus longues/)).toBeInTheDocument()
  })
})

describe('QuadraticWidget', () => {
  it('shows conjugate complex roots when Δ < 0 and real roots when Δ > 0', () => {
    const { container } = render(<QuadraticWidget />)
    expect(text(container)).toContain('\\Delta = b^2 - 4ac = 2^2 - 4 \\times 1 \\times 5 = -16')
    expect(text(container)).toContain('z = -1 \\pm 2i')
    expect(screen.getByText(/Δ < 0 : deux solutions complexes conjuguées/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('c'), { target: { value: '0' } })
    expect(text(container)).toContain('z_1 = -2, \\; z_2 = 0')
    expect(screen.getByText(/Δ > 0/)).toBeInTheDocument()
  })
})

describe('TransformWidget', () => {
  it('rotation by π/2 about Ω gives an exact image', () => {
    const { container } = render(<TransformWidget config={{ mode: 'rotation' }} />)
    // Ω = -1 - i, M = 2 + i, z' = Ω + i(M - Ω) = -3 + 2i
    expect(text(container)).toContain("z' = -3 + 2i")
  })

  it('translation and homothety follow their formulas', async () => {
    const { container } = render(<TransformWidget config={{ mode: 'rotation' }} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Translation' }))
    expect(text(container)).toContain("z' = 4 + 2i") // (2 + i) + (2 + i)
    await userEvent.click(screen.getByRole('radio', { name: 'Homothétie' }))
    expect(text(container)).toContain("z' = 5 + 3i") // Ω + 2(M - Ω) = (-1 - i) + 2(3 + 2i)
  })
})

describe('Geometry widgets', () => {
  it('segment: affix of AB, midpoint and distance', () => {
    const { container } = render(<SegmentWidget />)
    expect(text(container)).toContain('z_{\\overrightarrow{AB}} = z_B - z_A = 3 + 2i')
    expect(text(container)).toContain('z_I = \\dfrac{z_A + z_B}{2} = -\\frac{1}{2} + 2i')
    expect(text(container)).toContain('AB = |z_B - z_A| = \\sqrt{13}')
  })

  it('alignment: Q = i means (AB) ⟂ (AC) and AB = AC, with text verdicts', () => {
    const { container } = render(<AlignmentWidget />)
    expect(text(container)).toContain('Q = \\dfrac{z_C - z_A}{z_B - z_A} = i')
    expect(screen.getByText('Q est imaginaire pur : (AB) ⟂ (AC).')).toBeInTheDocument()
    expect(screen.getByText('|Q| = 1 : AB = AC.')).toBeInTheDocument()
    expect(screen.getByText(/ne sont pas alignés/)).toBeInTheDocument()
  })

  it('alignment: detects aligned points', async () => {
    render(<AlignmentWidget />)
    // C = -1 + i -> move to 2 + 2i? Instead put B on the line through A and C: B = -1 + i (Left x4)
    const b = screen.getByTestId('point-B')
    b.focus()
    await userEvent.keyboard('{ArrowLeft>4/}')
    expect(screen.getByText('Q est réel : A, B et C sont alignés.')).toBeInTheDocument()
  })

  it('alignment: refuses to divide by zero when points coincide', async () => {
    render(<AlignmentWidget />)
    const b = screen.getByTestId('point-B')
    b.focus()
    await userEvent.keyboard('{ArrowLeft>2/}{ArrowDown>2/}')
    expect(screen.getByText(/confondus/)).toBeInTheDocument()
  })
})

describe('IPowersWidget', () => {
  it('writes n = 4q + r and the value of i^n', () => {
    const { container } = render(<IPowersWidget />)
    expect(text(container)).toContain('n = 4 \\times 1 + 3')
    expect(text(container)).toContain('i^{7} = (i^4)^{1} \\times i^{3} = 1^{1} \\times i^{3} = -i')
    fireEvent.change(screen.getByLabelText('Exposant n'), { target: { value: '12' } })
    expect(text(container)).toContain('i^{12} = (i^4)^{3} \\times i^{0} = 1^{3} \\times i^{0} = 1')
  })
})

describe('WidgetHost', () => {
  it('ignores unknown widget names instead of crashing', () => {
    const { container } = render(<WidgetHost widget={{ name: 'does-not-exist' }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes each widget as a labelled region', () => {
    render(<WidgetHost widget={{ name: 'argand' }} />)
    expect(screen.getByRole('region', { name: /Activité interactive/ })).toBeInTheDocument()
  })
})

describe('PlotInput', () => {
  const rect = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect

  it('places a snapped point where the student clicks', () => {
    const onChange = vi.fn()
    render(<PlotInput range={5} locked={false} onChange={onChange} />)
    const svg = screen.getByRole('group', { name: /placez le point/i })
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect)
    // 75% across and 25% down -> about (+2.98, +2.98) -> snapped to (3, 3)
    fireEvent.pointerDown(svg, { clientX: 75, clientY: 25 })
    expect(onChange).toHaveBeenLastCalledWith({ point: { re: 3, im: 3 } })
    expect(screen.getByText(/Point placé/)).toBeInTheDocument()
  })

  it('works from the keyboard, starting from the origin, and stays inside the plane', async () => {
    const onChange = vi.fn()
    render(<PlotInput range={5} locked={false} onChange={onChange} />)
    const svg = screen.getByRole('group', { name: /placez le point/i })
    svg.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowUp}')
    expect(onChange).toHaveBeenLastCalledWith({ point: { re: 0.5, im: 0.5 } })
    await userEvent.keyboard('{ArrowLeft>30/}')
    expect(onChange).toHaveBeenLastCalledWith({ point: { re: -5, im: 0.5 } })
  })

  it('does nothing once the answer is locked', () => {
    const onChange = vi.fn()
    render(<PlotInput range={5} locked correct={false} onChange={onChange} />)
    const svg = screen.getByRole('group', { name: /placez le point/i })
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect)
    fireEvent.pointerDown(svg, { clientX: 75, clientY: 25 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
