import { request } from '../http'
import type { AnswerPayload, AnswerResult, Api, ChapterDTO, ChapterSummary, Lesson, MistakeDTO, ProgressDTO } from '../types'

export const restApi: Api = {
  getProgram: () => request<ChapterSummary[]>('GET', '/chapters'),

  getChapter: (id) => request<ChapterDTO>('GET', `/chapters/${id}`),

  getLesson: (id) =>
    id === 'review' ? request<Lesson>('POST', '/me/review-session') : request<Lesson>('GET', `/lessons/${id}`),

  // hintUsed is tracked server-side (the hint request), so the client flag is not sent.
  answer: (exerciseId: string, payload: AnswerPayload) =>
    request<AnswerResult>('POST', `/exercises/${exerciseId}/answer`, payload),

  getHint: async (exerciseId) => (await request<{ hint: string }>('POST', `/exercises/${exerciseId}/hint`)).hint,

  completeLesson: async (lessonId) => {
    if (lessonId !== 'review') await request<void>('POST', `/lessons/${lessonId}/complete`)
  },

  getProgress: () => request<ProgressDTO>('GET', '/me/progress'),
  getMistakes: () => request<MistakeDTO[]>('GET', '/me/mistakes'),
}

export async function authenticate(mode: 'login' | 'register', email: string, password: string, displayName: string) {
  const body = mode === 'login' ? { email, password } : { email, password, displayName }
  return request<{ token: string; displayName: string }>('POST', `/auth/${mode}`, body)
}
