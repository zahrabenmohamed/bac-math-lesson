import { describe, expect, it } from 'vitest'
import { initialPlayerState, playerReducer } from './player'

const ok = { correct: true, explanation: '', solution: '', xpAwarded: 10, mastered: false }

describe('playerReducer', () => {
  it('accumulates xp and counts on checked answers', () => {
    let s = playerReducer(initialPlayerState, { type: 'checked', result: ok })
    s = playerReducer(s, { type: 'next', total: 3 })
    s = playerReducer(s, { type: 'checked', result: { ...ok, correct: false, xpAwarded: 0 } })
    expect(s.xpGained).toBe(10)
    expect(s.correctCount).toBe(1)
    expect(s.answeredCount).toBe(2)
  })

  it('resets per-step state on next and finishes after the last step', () => {
    let s = playerReducer(initialPlayerState, { type: 'hint', text: 'indice' })
    s = playerReducer(s, { type: 'checked', result: ok })
    s = playerReducer(s, { type: 'next', total: 2 })
    expect(s).toMatchObject({ index: 1, result: null, hintUsed: false, hint: null, finished: false })
    s = playerReducer(s, { type: 'next', total: 2 })
    expect(s.finished).toBe(true)
  })
})
