import type { Api, ChapterDTO, Lesson, MistakeDTO, ProgressDTO, Step } from '../types'
import { mockExercises, mockLessons } from './data'

interface Attempt { ex: string; lesson: string; skill: string; correct: boolean; at: number }
interface Store {
  xp: number
  streak: number
  lastDay: string | null
  completed: string[]
  attempts: Attempt[]
  mastery: Record<string, { streak: number; mastered: boolean }>
}

const KEY = 'bac-complexes-mock-v1'
const empty = (): Store => ({ xp: 0, streak: 0, lastDay: null, completed: [], attempts: [], mastery: {} })

function load(): Store {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return empty()
  }
}
function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage unavailable */ }
}

const day = (d = new Date()) => d.toISOString().slice(0, 10)
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120))
const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1

export const mockApi: Api = {
  async getChapter(): Promise<ChapterDTO> {
    const s = load()
    const lessons = mockLessons.map((l, i) => {
      const done = s.completed.includes(l.id)
      const prevOk = i === 0 || s.completed.includes(mockLessons[i - 1].id)
      const partLessons = mockLessons.filter((x) => x.part === l.part && x.kind === 'LESSON')
      const bossOk = l.kind !== 'BOSS' || partLessons.every((x) => s.completed.includes(x.id))
      const answered = new Set(s.attempts.filter((a) => a.lesson === l.id).map((a) => a.ex))
      const exTotal = l.steps.filter((st) => st.type === 'EXERCISE').length
      return {
        id: l.id, title: l.title, part: l.part, kind: l.kind,
        status: done ? 'completed' : prevOk && bossOk ? 'unlocked' : 'locked',
        stepsDone: done ? exTotal || 1 : answered.size,
        stepsTotal: exTotal || 1,
      } as const
    })
    return delay({ id: 'complexes', title: 'Les nombres complexes', lessons: [...lessons] })
  },

  async getLesson(id): Promise<Lesson> {
    if (id === 'review') {
      const s = load()
      const steps: Step[] = Object.entries(s.mastery)
        .filter(([, m]) => !m.mastered)
        .map(([exId]) => ({ type: 'EXERCISE', exercise: mockExercises.get(exId)!.exercise }))
      return delay({ id, title: 'Révision de mes erreurs', steps })
    }
    const l = mockLessons.find((x) => x.id === id)
    if (!l) throw new Error('Leçon introuvable')
    return delay({ id: l.id, title: l.title, steps: l.steps })
  },

  async answer(exerciseId, payload, hintUsed) {
    const m = mockExercises.get(exerciseId)
    if (!m) throw new Error('Exercice introuvable')
    const s = load()
    const out = m.check(payload)
    s.attempts.push({ ex: exerciseId, lesson: m.lessonId, skill: m.exercise.skill, correct: out.correct, at: Date.now() })

    const today = day()
    if (s.lastDay !== today) {
      const yesterday = day(new Date(Date.now() - 86_400_000))
      s.streak = s.lastDay === yesterday ? s.streak + 1 : 1
      s.lastDay = today
    }

    const xpAwarded = out.correct ? (hintUsed ? 5 : 10) : 0
    s.xp += xpAwarded

    let mastered = false
    const prev = s.mastery[exerciseId]
    if (!out.correct) s.mastery[exerciseId] = { streak: 0, mastered: false }
    else if (prev) {
      const streak = prev.streak + 1
      mastered = streak >= 2
      s.mastery[exerciseId] = { streak, mastered }
    }
    save(s)
    return delay({ ...out, solution: m.solution, xpAwarded, mastered })
  },

  async getHint(exerciseId) {
    return delay(mockExercises.get(exerciseId)?.hint ?? '')
  },

  async completeLesson(lessonId) {
    if (lessonId === 'review') return
    const s = load()
    if (!s.completed.includes(lessonId)) s.completed.push(lessonId)
    save(s)
  },

  async getProgress(): Promise<ProgressDTO> {
    const s = load()
    const level = levelOf(s.xp)
    const base = 50 * (level - 1) ** 2
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const end = Date.now() - (7 - i) * 7 * 86_400_000
      const count = s.attempts.filter((a) => a.at > end - 7 * 86_400_000 && a.at <= end + 1000).length
      return { label: i === 7 ? 'Cette sem.' : `S-${7 - i}`, count }
    })
    const bySkill = new Map<string, { ok: number; n: number }>()
    for (const a of s.attempts) {
      const e = bySkill.get(a.skill) ?? { ok: 0, n: 0 }
      e.n++
      if (a.correct) e.ok++
      bySkill.set(a.skill, e)
    }
    return delay({
      xp: s.xp, level, xpInLevel: s.xp - base, xpForNext: 50 * level ** 2 - base, streakDays: s.streak,
      lessons: mockLessons.filter((l) => l.kind === 'LESSON').map((l) => {
        const a = s.attempts.filter((x) => x.lesson === l.id)
        return { id: l.id, title: l.title, correct: a.filter((x) => x.correct).length, total: a.length }
      }),
      weeks,
      weakSkills: [...bySkill].map(([skill, v]) => ({ skill, rate: v.ok / v.n })).sort((a, b) => a.rate - b.rate).slice(0, 4),
    })
  },

  async getMistakes(): Promise<MistakeDTO[]> {
    const s = load()
    return delay(
      Object.entries(s.mastery).filter(([, m]) => !m.mastered).map(([id, m]) => {
        const e = mockExercises.get(id)!
        const lesson = mockLessons.find((l) => l.id === e.lessonId)
        return { exerciseId: id, lessonTitle: lesson?.title ?? '', prompt: e.exercise.prompt, skill: e.exercise.skill, streak: m.streak }
      }),
    )
  },
}
