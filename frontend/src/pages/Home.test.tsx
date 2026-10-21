import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChapterSummary } from '../lib/types'

const api = vi.hoisted(() => ({ getProgram: vi.fn() }))
vi.mock('../lib/api', () => ({ api }))

import { Home } from './Home'

const chapter = (over: Partial<ChapterSummary>): ChapterSummary => ({
  id: 'x', title: 'Chapitre', summary: 'Résumé.', position: 1, available: false,
  lessonsTotal: 0, lessonsDone: 0, nextLessonId: null, ...over,
})

const program: ChapterSummary[] = [
  chapter({ id: 'limites', title: 'Limites et continuité', position: 1 }),
  chapter({ id: 'complexes', title: 'Les nombres complexes', position: 2, available: true, lessonsTotal: 9, lessonsDone: 3, nextLessonId: 'L04' }),
  chapter({ id: 'integrale', title: 'Calcul intégral', position: 3 }),
]

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><Home /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getProgram.mockResolvedValue(program)
})

describe('Home (programme de l’année)', () => {
  it('lists every chapter of the year in order', async () => {
    renderHome()
    const list = await screen.findByRole('list', { name: 'Chapitres du programme' })
    const titles = within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Limites et continuité', 'Les nombres complexes', 'Calcul intégral'])
    expect(screen.getByText('1/3 chapitres disponibles · 3/9 étapes terminées')).toBeInTheDocument()
  })

  it('links only available chapters and labels the others "À venir" in text', async () => {
    renderHome()
    await screen.findByRole('list', { name: 'Chapitres du programme' })
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/chapitres/complexes')
    expect(hrefs.filter((h) => h?.startsWith('/chapitres/'))).toEqual(['/chapitres/complexes'])
    expect(screen.queryByRole('link', { name: /Limites et continuité/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Calcul intégral/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('À venir')).toHaveLength(2)
  })

  it('shows progress for the available chapter', async () => {
    renderHome()
    const bar = await screen.findByRole('progressbar', { name: 'Progression : Les nombres complexes' })
    expect(bar).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('3/9 étapes')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
  })

  it('offers one primary action that resumes the next lesson', async () => {
    renderHome()
    const resume = await screen.findByRole('link', { name: 'Reprendre : Les nombres complexes' })
    expect(resume).toHaveAttribute('href', '/lecons/L04')
  })

  it('offers to start when nothing is done yet', async () => {
    api.getProgram.mockResolvedValue([chapter({ id: 'complexes', title: 'Les nombres complexes', available: true, lessonsTotal: 9, nextLessonId: 'L01' })])
    renderHome()
    expect(await screen.findByRole('link', { name: 'Commencer : Les nombres complexes' })).toHaveAttribute('href', '/lecons/L01')
  })

  it('shows an error message when the programme cannot be loaded', async () => {
    api.getProgram.mockRejectedValue(new Error('boom'))
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger le programme')
  })
})
