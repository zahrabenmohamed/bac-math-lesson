import type { AnswerResult } from './types'

export interface PlayerState {
  index: number
  result: AnswerResult | null
  hintUsed: boolean
  hint: string | null
  xpGained: number
  correctCount: number
  answeredCount: number
  finished: boolean
}

export type PlayerAction =
  | { type: 'hint'; text: string }
  | { type: 'checked'; result: AnswerResult }
  | { type: 'next'; total: number }

export const initialPlayerState: PlayerState = {
  index: 0, result: null, hintUsed: false, hint: null,
  xpGained: 0, correctCount: 0, answeredCount: 0, finished: false,
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'hint':
      return { ...state, hintUsed: true, hint: action.text }
    case 'checked':
      return {
        ...state,
        result: action.result,
        xpGained: state.xpGained + action.result.xpAwarded,
        correctCount: state.correctCount + (action.result.correct ? 1 : 0),
        answeredCount: state.answeredCount + 1,
      }
    case 'next': {
      const index = state.index + 1
      return { ...state, index, result: null, hintUsed: false, hint: null, finished: index >= action.total }
    }
  }
}
