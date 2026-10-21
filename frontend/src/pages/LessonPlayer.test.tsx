import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lesson } from '../lib/types'

const api = vi.hoisted(() => ({
  getLesson: vi.fn(),
  answer: vi.fn(),
  getHint: vi.fn(),
  completeLesson: vi.fn(),
}))
vi.mock('../lib/api', () => ({ api }))

import { LessonPlayer } from './LessonPlayer'

const lesson: Lesson = {
  id: 'T1',
  title: 'Leçon de test',
  steps: [
    { type: 'EXPLANATION', title: 'Introduction', body: 'Du texte.' },
    {
      type: 'EXERCISE',
      exercise: {
        id: 'T1-E1', type: 'QCM', skill: 'Test', prompt: 'Question ?', multiple: false,
        options: [{ id: 'a', text: 'Oui' }, { id: 'b', text: 'Non' }],
      },
    },
  ],
}

function renderPlayer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/lecons/T1']}>
        <Routes>
          <Route path="/lecons/:id" element={<LessonPlayer />} />
          <Route path="/" element={<p>Parcours</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getLesson.mockResolvedValue(lesson)
  api.completeLesson.mockResolvedValue(undefined)
})

describe('LessonPlayer', () => {
  it('walks explanation -> exercise -> feedback -> summary using Enter', async () => {
    api.answer.mockResolvedValue({ correct: true, explanation: '', solution: 'Parce que.', xpAwarded: 10, mastered: false })
    renderPlayer()

    expect(await screen.findByRole('heading', { name: 'Introduction' })).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')

    await userEvent.click(await screen.findByRole('radio', { name: 'Oui' }))
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith('T1-E1', { choices: ['a'] }, false))
    expect(await screen.findByText('Correct')).toBeInTheDocument()
    expect(screen.getByText(/\+10 XP/)).toBeInTheDocument()

    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Leçon terminée' })).toBeInTheDocument()
    expect(api.completeLesson).toHaveBeenCalledWith('T1')
    expect(screen.getByText('+10')).toBeInTheDocument()
  })

  it('does not check an exercise until an answer is selected', async () => {
    renderPlayer()
    await screen.findByRole('heading', { name: 'Introduction' })
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: 'Vérifier' })).toBeDisabled()
    await userEvent.keyboard('{Enter}')
    expect(api.answer).not.toHaveBeenCalled()
  })

  it('shows an incorrect answer with its label, explanation and solution', async () => {
    api.answer.mockResolvedValue({
      correct: false, explanation: 'Erreur typique.', solution: 'Voici la solution.', xpAwarded: 0, mastered: false,
    })
    renderPlayer()
    await screen.findByRole('heading', { name: 'Introduction' })
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await screen.findByRole('radio', { name: 'Non' }))
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByText('Incorrect')).toBeInTheDocument()
    expect(screen.getByText('Erreur typique.')).toBeInTheDocument()
    expect(screen.getByText('Voici la solution.')).toBeInTheDocument()
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument()
  })

  it('shows the server error and stays on the exercise when the answer is rejected', async () => {
    api.answer.mockRejectedValue(new Error('Réponse illisible'))
    renderPlayer()
    await screen.findByRole('heading', { name: 'Introduction' })
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await screen.findByRole('radio', { name: 'Oui' }))
    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Réponse illisible')
    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeEnabled()
  })

  it('requests a hint and passes hintUsed to the answer call', async () => {
    api.getHint.mockResolvedValue('Un indice.')
    api.answer.mockResolvedValue({ correct: true, explanation: '', solution: '', xpAwarded: 5, mastered: false })
    renderPlayer()
    await screen.findByRole('heading', { name: 'Introduction' })
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: /indice/i }))
    expect(await screen.findByText('Un indice.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Oui' }))
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith('T1-E1', { choices: ['a'] }, true))
  })

  it('shows the interactive widget and the key point of an explanation step', async () => {
    api.getLesson.mockResolvedValue({
      id: 'T1', title: 'Leçon', steps: [
        { type: 'EXPLANATION', title: 'Plan', body: 'Texte.', keypoint: 'Retenez **ceci**.', widget: { name: 'argand' } },
      ],
    })
    renderPlayer()
    expect(await screen.findByRole('region', { name: /Activité interactive/ })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'À retenir' })).toHaveTextContent('Retenez ceci.')
  })

  it('plays a PLOT exercise: sends the placed point to the server', async () => {
    api.getLesson.mockResolvedValue({
      id: 'T1', title: 'Leçon', steps: [
        { type: 'EXERCISE', exercise: { id: 'T1-P', type: 'PLOT', skill: 'Plan', prompt: 'Placez M.', range: 5 } },
      ],
    })
    api.answer.mockResolvedValue({ correct: true, explanation: '', solution: 's', xpAwarded: 10, mastered: false })
    renderPlayer()
    const plane = await screen.findByRole('group', { name: /placez le point/i })
    plane.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowUp}')
    await userEvent.click(await screen.findByRole('button', { name: 'Vérifier' }))
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith('T1-P', { point: { re: 1, im: 0.5 } }, false))
    expect(await screen.findByText('Correct')).toBeInTheDocument()
  })

  it('shows an empty state for a review session with nothing to review', async () => {
    api.getLesson.mockResolvedValue({ id: 'review', title: 'Révision', steps: [] })
    renderPlayer()
    expect(await screen.findByText('Rien à réviser')).toBeInTheDocument()
  })
})
