import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { AnswerResult, Exercise } from '../../lib/types'
import { ExerciseView } from './ExerciseView'

const meta = {
  title: 'Exercices/ExerciseView',
  component: ExerciseView,
  args: { result: null, onChange: fn() },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof ExerciseView>

export default meta
type Story = StoryObj<typeof meta>

const single: Exercise = {
  id: 'S-QCM-1', type: 'QCM', skill: 'Forme algébrique', multiple: false,
  prompt: 'Quelle est la partie imaginaire de $z = 4 - 7i$ ?',
  options: [{ id: 'a', text: '$7$' }, { id: 'b', text: '$-7$' }, { id: 'c', text: '$-7i$' }, { id: 'd', text: '$4$' }],
}

const multiple: Exercise = {
  id: 'S-QCM-2', type: 'QCM', skill: 'Puissances de i', multiple: true,
  prompt: 'Quelles égalités sont vraies ? (plusieurs réponses possibles)',
  options: [
    { id: 'a', text: '$i^2 = -1$' }, { id: 'b', text: '$i^3 = -i$' },
    { id: 'c', text: '$i^4 = i$' }, { id: 'd', text: '$(1 + i)^2 = 2i$' },
  ],
}

const numeric: Exercise = {
  id: 'S-NUM-1', type: 'NUMERIC', skill: 'Opérations', format: 'complex', placeholder: 'ex. 3 - 2i',
  prompt: 'Écrire sous forme algébrique : $(2 + 3i) + (1 - 5i)$.',
}

const real: Exercise = {
  id: 'S-NUM-2', type: 'NUMERIC', skill: 'Module', format: 'real', placeholder: 'ex. 13',
  prompt: 'Calculer $|5 - 12i|$.',
}

const method: Exercise = {
  id: 'S-METH-1', type: 'METHOD', skill: 'Opérations',
  prompt: 'Calculer $(2 + i)^2$ sous forme algébrique. À chaque étape, choisissez la bonne action.',
  stages: [
    { question: 'Première étape', options: [
      { id: 's1a', text: 'Développer : $2^2 + 2\\times 2\\times i + i^2$' },
      { id: 's1b', text: 'Écrire $(2+i)^2 = 2^2 + i^2$' },
      { id: 's1c', text: 'Calculer le module de $2 + i$' } ] },
    { question: 'Que faire de $i^2$ ?', options: [
      { id: 's2a', text: 'Le remplacer par $1$' },
      { id: 's2b', text: 'Le remplacer par $-1$' },
      { id: 's2c', text: 'Le laisser tel quel' } ] },
    { question: 'Conclusion', options: [
      { id: 's3a', text: '$3 + 4i$' }, { id: 's3b', text: '$5 + 4i$' }, { id: 's3c', text: '$3 + 2i$' } ] },
  ],
}

const ok: AnswerResult = { correct: true, explanation: '', solution: '', xpAwarded: 10, mastered: false }
const ko: AnswerResult = { correct: false, explanation: '', solution: '', xpAwarded: 0, mastered: false }

export const SingleChoice: Story = {
  args: { exercise: single },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const radios = canvas.getAllByRole('radio')
    await userEvent.click(radios[1])
    await expect(radios[1]).toBeChecked()
    await expect(args.onChange).toHaveBeenLastCalledWith({ choices: ['b'] })
  },
}

export const MultipleChoice: Story = {
  args: { exercise: multiple },
  play: async ({ canvasElement, args }) => {
    const boxes = within(canvasElement).getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    await userEvent.click(boxes[3])
    await expect(args.onChange).toHaveBeenLastCalledWith({ choices: ['a', 'd'] })
  },
}

export const Locked: Story = { args: { exercise: single, result: ok } }

export const NumericComplex: Story = {
  args: { exercise: numeric },
  play: async ({ canvasElement, args }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Votre réponse'), '3 - 2i')
    await expect(args.onChange).toHaveBeenLastCalledWith({ text: '3 - 2i' })
  },
}

export const NumericReal: Story = { args: { exercise: real } }

export const MethodSteps: Story = {
  args: { exercise: method },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByText('Conclusion')).toBeNull()
    await userEvent.click(canvas.getAllByRole('radio')[0])
    await userEvent.click(canvas.getAllByRole('radio')[4])
    await expect(canvas.getByText('Conclusion')).toBeInTheDocument()
    await userEvent.click(canvas.getAllByRole('radio')[6])
    await expect(args.onChange).toHaveBeenLastCalledWith({ choices: ['s1a', 's2b', 's3a'] })
  },
}

/** Answers the three stages (the second one wrongly), then shows the server's stage-by-stage grading. */
export const MethodStepsGraded: Story = {
  args: { exercise: method },
  render: (args) => {
    const [result, setResult] = useState<AnswerResult | null>(null)
    return (
      <>
        <ExerciseView {...args} result={result} />
        <button type="button" className="mt-6 rounded-lg bg-brand px-4 py-2 text-on-brand"
          onClick={() => setResult({ ...ko, stageResults: [true, false, true] })}>
          Simuler la correction du serveur
        </button>
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByRole('radio')[0])
    await userEvent.click(canvas.getAllByRole('radio')[3])
    await userEvent.click(canvas.getAllByRole('radio')[6])
    await userEvent.click(canvas.getByRole('button', { name: /Simuler/ }))
    await expect(canvas.getAllByText('Correct')).toHaveLength(2)
    await expect(canvas.getAllByText('Incorrect')).toHaveLength(1)
  },
}
