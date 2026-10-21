import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AnswerResult, Exercise } from '../../lib/types'
import { ExerciseView } from './ExerciseView'

const qcm = (multiple: boolean): Exercise => ({
  id: 'T-QCM', type: 'QCM', skill: 'Forme algébrique', prompt: 'Choisissez.', multiple,
  options: [
    { id: 'a', text: 'Réponse A' },
    { id: 'b', text: 'Réponse B' },
    { id: 'c', text: 'Réponse C' },
  ],
})

const mathQcm: Exercise = {
  id: 'T-MATH', type: 'QCM', skill: 'Forme algébrique', prompt: 'Partie imaginaire de $z = 4 - 7i$ ?', multiple: false,
  options: [{ id: 'a', text: '$7$' }, { id: 'b', text: '$-7$' }, { id: 'c', text: '$-7i$' }],
}

const numeric: Exercise = {
  id: 'T-NUM', type: 'NUMERIC', skill: 'Opérations', prompt: 'Calculer.', format: 'complex', placeholder: 'ex. 3 - 2i',
}

const method: Exercise = {
  id: 'T-METH', type: 'METHOD', skill: 'Opérations', prompt: 'Calculer $(2+i)^2$.',
  stages: [
    { question: 'Première étape', options: [{ id: 's1a', text: 'Développer' }, { id: 's1b', text: 'Ignorer' }] },
    { question: 'Deuxième étape', options: [{ id: 's2a', text: 'Remplacer $i^2$ par $-1$' }, { id: 's2b', text: 'Laisser' }] },
    { question: 'Conclusion', options: [{ id: 's3a', text: 'Résultat' }, { id: 's3b', text: 'Autre' }] },
  ],
}

const result = (over: Partial<AnswerResult> = {}): AnswerResult => ({
  correct: true, explanation: '', solution: 's', xpAwarded: 10, mastered: false, ...over,
})

describe('QCM', () => {
  it('exposes every option with a real accessible name, including math options', () => {
    render(<ExerciseView exercise={mathQcm} result={null} onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    for (const radio of radios) {
      expect(radio).toHaveAccessibleName()
      expect(radio).not.toHaveAccessibleName('on')
      // Regression: browsers reported the default value "on" when the label held block-level markup.
      // Each input must point at an inline text element, and its label must not contain <p>/<div>.
      const target = document.getElementById(radio.getAttribute('aria-labelledby') ?? '')
      expect(target?.tagName).toBe('SPAN')
      expect(radio.closest('label')?.querySelector('p, div')).toBeNull()
    }
  })

  it('names plain-text options by their text', () => {
    render(<ExerciseView exercise={qcm(false)} result={null} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Réponse B' })).toBeInTheDocument()
  })

  it('single choice replaces the previous selection', async () => {
    const onChange = vi.fn()
    render(<ExerciseView exercise={qcm(false)} result={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Réponse A' }))
    expect(onChange).toHaveBeenLastCalledWith({ choices: ['a'] })
    await userEvent.click(screen.getByRole('radio', { name: 'Réponse C' }))
    expect(onChange).toHaveBeenLastCalledWith({ choices: ['c'] })
    expect(screen.getByRole('radio', { name: 'Réponse A' })).not.toBeChecked()
  })

  it('multiple choice toggles options and reports null when nothing is selected', async () => {
    const onChange = vi.fn()
    render(<ExerciseView exercise={qcm(true)} result={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Réponse A' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Réponse C' }))
    expect(onChange).toHaveBeenLastCalledWith({ choices: ['a', 'c'] })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Réponse A' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Réponse C' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('locks the options once a result is shown', () => {
    render(<ExerciseView exercise={qcm(false)} result={result()} onChange={vi.fn()} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})

describe('NUMERIC', () => {
  it('reports the typed text and null when empty or blank', async () => {
    const onChange = vi.fn()
    render(<ExerciseView exercise={numeric} result={null} onChange={onChange} />)
    const input = screen.getByLabelText('Votre réponse')
    await userEvent.type(input, '3 - 2i')
    expect(onChange).toHaveBeenLastCalledWith({ text: '3 - 2i' })
    await userEvent.clear(input)
    expect(onChange).toHaveBeenLastCalledWith(null)
    await userEvent.type(input, '   ')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('shows the placeholder and the expected-format hint, and locks after a result', () => {
    render(<ExerciseView exercise={numeric} result={result()} onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('ex. 3 - 2i')).toBeDisabled()
    expect(screen.getByText(/forme algébrique/i)).toBeInTheDocument()
  })
})

describe('METHOD', () => {
  it('reveals stages one at a time and only reports an answer when every stage is chosen', async () => {
    const onChange = vi.fn()
    render(<ExerciseView exercise={method} result={null} onChange={onChange} />)
    expect(screen.getByText('Première étape')).toBeInTheDocument()
    expect(screen.queryByText('Deuxième étape')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Développer' }))
    expect(screen.getByText('Deuxième étape')).toBeInTheDocument()
    expect(screen.queryByText('Conclusion')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(null)

    await userEvent.click(screen.getByRole('radio', { name: 'Laisser' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Résultat' }))
    expect(onChange).toHaveBeenLastCalledWith({ choices: ['s1a', 's2b', 's3a'] })
  })

  it('changing an earlier stage discards the later choices', async () => {
    const onChange = vi.fn()
    render(<ExerciseView exercise={method} result={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Développer' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Laisser' }))
    expect(screen.getByText('Conclusion')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Ignorer' }))
    expect(screen.queryByText('Conclusion')).not.toBeInTheDocument()
    expect(screen.queryByText('Deuxième étape')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Laisser' })).not.toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('labels each stage Correct or Incorrect with text, not colour alone', async () => {
    const { rerender } = render(<ExerciseView exercise={method} result={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Développer' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Laisser' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Résultat' }))
    rerender(<ExerciseView exercise={method} result={result({ correct: false, stageResults: [true, false, true] })} onChange={vi.fn()} />)
    expect(screen.getAllByText('Correct')).toHaveLength(2)
    expect(screen.getAllByText('Incorrect')).toHaveLength(1)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})
