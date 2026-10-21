/** Interactive activity attached to an explanation step: { name: 'argand', ...config }. */
export interface WidgetSpec {
  name: string
  [config: string]: unknown
}

export type LessonStatus = 'locked' | 'unlocked' | 'completed'

export interface LessonSummary {
  id: string
  title: string
  part: 1 | 2
  kind: 'LESSON' | 'BOSS'
  status: LessonStatus
  stepsDone: number
  stepsTotal: number
}

export interface ChapterDTO {
  id: string
  title: string
  lessons: LessonSummary[]
}

export interface Option {
  id: string
  text: string
}

interface ExerciseBase {
  id: string
  skill: string
  prompt: string
}

export type Exercise =
  | (ExerciseBase & { type: 'QCM'; multiple: boolean; options: Option[] })
  | (ExerciseBase & { type: 'NUMERIC'; format: 'complex' | 'real'; placeholder?: string })
  | (ExerciseBase & { type: 'METHOD'; stages: { question: string; options: Option[] }[] })
  | (ExerciseBase & { type: 'PLOT'; range: number })

export type Step =
  | {
      type: 'EXPLANATION'
      title: string
      body: string
      example?: { statement: string; solution: string }
      /** Short takeaway shown in a highlighted box. */
      keypoint?: string
      /** Interactive activity (see widgets/WidgetHost). */
      widget?: WidgetSpec
    }
  | { type: 'EXERCISE'; exercise: Exercise }

export interface Lesson {
  id: string
  title: string
  chapterId?: string | null
  steps: Step[]
}

export type AnswerPayload = { choices: string[] } | { text: string } | { point: { re: number; im: number } }

export interface AnswerResult {
  correct: boolean
  explanation: string
  solution: string
  xpAwarded: number
  mastered: boolean
  stageResults?: boolean[]
}

export interface ProgressDTO {
  xp: number
  level: number
  xpInLevel: number
  xpForNext: number
  streakDays: number
  lessons: { id: string; title: string; correct: number; total: number }[]
  weeks: { label: string; count: number }[]
  weakSkills: { skill: string; rate: number }[]
}

export interface MistakeDTO {
  exerciseId: string
  lessonTitle: string
  prompt: string
  skill: string
  streak: number
}

/** One chapter of the year's programme; unavailable chapters have no lessons yet. */
export interface ChapterSummary {
  id: string
  title: string
  summary: string
  position: number
  available: boolean
  lessonsTotal: number
  lessonsDone: number
  nextLessonId: string | null
}

export interface Api {
  getProgram(): Promise<ChapterSummary[]>
  getChapter(id: string): Promise<ChapterDTO>
  getLesson(id: string): Promise<Lesson>
  answer(exerciseId: string, payload: AnswerPayload, hintUsed: boolean): Promise<AnswerResult>
  getHint(exerciseId: string): Promise<string>
  completeLesson(lessonId: string): Promise<void>
  getProgress(): Promise<ProgressDTO>
  getMistakes(): Promise<MistakeDTO[]>
}
