import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Rich, RichInline } from './Rich'

describe('Rich', () => {
  it('renders paragraphs, bullet lists and bold text', () => {
    render(<Rich text={'Premier **gras**.\n\n- un\n- deux'} />)
    expect(screen.getByText('gras').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['un', 'deux'])
  })

  it('renders inline and display math with KaTeX', () => {
    const { container } = render(<Rich text={'Soit $z = a + bi$ :\n\n$$|z| = \\sqrt{a^2 + b^2}$$'} />)
    expect(container.querySelectorAll('.katex')).toHaveLength(2)
    expect(container.querySelector('.katex-display')).not.toBeNull()
    expect(container.querySelector('math')).not.toBeNull()
  })

  it('does not throw on invalid TeX', () => {
    expect(() => render(<Rich text={'Cassé : $\\frac{1}{$'} />)).not.toThrow()
  })

  it('does not interpret HTML in content as markup', () => {
    const { container } = render(<Rich text={'<img src=x onerror=alert(1)> et <b>gras</b>'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
  })
})

describe('RichInline', () => {
  it('renders a single span so it is valid inside a label', () => {
    const { container } = render(<label><RichInline id="x" text="Valeur $i^2 = -1$" /></label>)
    const span = container.querySelector('#x')
    expect(span?.tagName).toBe('SPAN')
    expect(container.querySelector('label p, label div')).toBeNull()
  })
})
