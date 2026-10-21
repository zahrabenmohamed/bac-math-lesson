// Demo content used only by the mock API (no backend needed). The real content lives in
// backend/src/main/resources/content and the real API never ships `check` to the client.
import type { AnswerPayload, Exercise, Option, Step } from '../types'

export interface CheckOutcome {
  correct: boolean
  explanation: string
  stageResults?: boolean[]
}

export interface MockExercise {
  exercise: Exercise
  lessonId: string
  hint: string
  solution: string
  check: (p: AnswerPayload) => CheckOutcome
}

export interface MockLesson {
  id: string
  title: string
  part: 1 | 2
  kind: 'LESSON' | 'BOSS'
  steps: Step[]
}

// ---- parsing helpers (mock grading only) ----
function parseReal(raw: string): number {
  let s = raw.replace(/\s/g, '').replace(',', '.').replace('−', '-').replace('√', 'sqrt')
  const sq = s.match(/^([+-]?)sqrt\(?([\d.]+)\)?$/)
  if (sq) return (sq[1] === '-' ? -1 : 1) * Math.sqrt(Number(sq[2]))
  if (s.includes('/')) {
    const [a, b] = s.split('/')
    return Number(a) / Number(b)
  }
  return Number(s)
}

function parseComplex(raw: string): { re: number; im: number } | null {
  const s = raw.replace(/\s/g, '').replace(/−/g, '-').replace(/,/g, '.')
  if (!s) return null
  const terms = s.match(/[+-]?[^+-]+/g)
  if (!terms || terms.join('') !== s) return null
  let re = 0
  let im = 0
  for (const t of terms) {
    if (t.endsWith('i')) {
      const c = t.slice(0, -1)
      const v = c === '' || c === '+' ? 1 : c === '-' ? -1 : parseReal(c)
      if (Number.isNaN(v)) return null
      im += v
    } else {
      const v = parseReal(t)
      if (Number.isNaN(v)) return null
      re += v
    }
  }
  return { re, im }
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

// ---- builders ----
const opts = (pairs: string[]): Option[] => pairs.map((text, i) => ({ id: String.fromCharCode(97 + i), text }))

function qcm(
  id: string, lessonId: string, skill: string, prompt: string, texts: string[],
  correct: string[], feedback: Record<string, string>, solution: string, hint: string, multiple = false,
): MockExercise {
  return {
    lessonId, hint, solution,
    exercise: { id, type: 'QCM', skill, prompt, multiple, options: opts(texts) },
    check: (p) => {
      const chosen = 'choices' in p ? p.choices : []
      const ok = chosen.length === correct.length && correct.every((c) => chosen.includes(c))
      const ids = new Set([...chosen.filter((c) => !correct.includes(c)), ...correct.filter((c) => !chosen.includes(c))])
      return { correct: ok, explanation: ok ? '' : [...ids].map((i) => feedback[i]).filter(Boolean).join(' ') }
    },
  }
}

function numeric(
  id: string, lessonId: string, skill: string, prompt: string, format: 'complex' | 'real',
  expected: { re: number; im: number } | number, solution: string, hint: string, placeholder: string,
): MockExercise {
  return {
    lessonId, hint, solution,
    exercise: { id, type: 'NUMERIC', skill, prompt, format, placeholder },
    check: (p) => {
      const text = 'text' in p ? p.text : ''
      let ok = false
      if (typeof expected === 'number') ok = near(parseReal(text), expected, 0.01)
      else {
        const c = parseComplex(text)
        ok = !!c && near(c.re, expected.re, 0.001) && near(c.im, expected.im, 0.001)
      }
      return {
        correct: ok,
        explanation: ok ? '' : 'Le résultat n’est pas équivalent à la réponse attendue. Comparez séparément partie réelle et partie imaginaire.',
      }
    },
  }
}

const exercises: MockExercise[] = [
  qcm('L01-E1', 'L01', 'Forme algébrique', 'Quelle est la partie imaginaire de $z = 4 - 7i$ ?',
    ['$7$', '$-7$', '$-7i$', '$4$'], ['b'],
    { a: 'Le signe est oublié : $z = 4 + (-7)\\,i$, la partie imaginaire est négative.',
      c: 'La partie imaginaire est le réel $b$ dans $a + bi$ : on ne garde pas le $i$.',
      d: '$4$ est la partie réelle, pas la partie imaginaire.' },
    '$z = 4 + (-7)\\,i$ donc $\\operatorname{Im}(z) = -7$.',
    'Écrivez $z$ sous la forme $a + bi$ et repérez $b$ avec son signe.'),
  numeric('L01-E2', 'L01', 'Opérations', 'Écrire sous forme algébrique : $(2 + 3i) + (1 - 5i)$.', 'complex',
    { re: 3, im: -2 },
    'On additionne les parties réelles puis les parties imaginaires : $(2+1) + (3-5)i = 3 - 2i$.',
    'Additionnez séparément les parties réelles et les parties imaginaires.', 'ex. 3 - 2i'),
  {
    ...numeric('L01-E3', 'L01', 'Opérations', 'Écrire sous forme algébrique : $(1 + 2i)(3 - i)$.', 'complex',
      { re: 5, im: 5 },
      '$(1+2i)(3-i) = 3 - i + 6i - 2i^2 = 3 + 5i + 2 = 5 + 5i$.',
      'Développez, puis remplacez $i^2$ par $-1$.', 'ex. 5 + 5i'),
  },
  {
    lessonId: 'L01',
    hint: 'Développez avec $(a+b)^2 = a^2 + 2ab + b^2$.',
    solution: '$(2+i)^2 = 4 + 4i + i^2 = 4 + 4i - 1 = 3 + 4i$.',
    exercise: {
      id: 'L01-E4', type: 'METHOD', skill: 'Opérations',
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
          { id: 's3a', text: '$3 + 4i$' },
          { id: 's3b', text: '$5 + 4i$' },
          { id: 's3c', text: '$3 + 2i$' } ] },
      ],
    },
    check: (p) => {
      const fb: Record<string, string> = {
        s1b: 'Erreur classique : $(a+b)^2 \\neq a^2 + b^2$, il manque le double produit.',
        s1c: 'Le module n’est pas utile pour obtenir la forme algébrique.',
        s2a: '$i^2$ vaut $-1$, pas $1$.',
        s2c: 'Il faut remplacer $i^2$ pour obtenir une forme $a + bi$.',
        s3b: '$4 + 4i + i^2 = 4 + 4i - 1$ : on soustrait $1$.',
        s3c: 'Le terme $2ab\\,i = 4i$ : la partie imaginaire vaut $4$.',
      }
      const expected = ['s1a', 's2b', 's3a']
      const chosen = 'choices' in p ? p.choices : []
      const stageResults = expected.map((e, i) => chosen[i] === e)
      return {
        correct: stageResults.every(Boolean), stageResults,
        explanation: chosen.filter((c) => fb[c]).map((c) => fb[c]).join(' '),
      }
    },
  },
  qcm('L01-E5', 'L01', 'Puissances de i', 'Quelles égalités sont vraies ? (plusieurs réponses possibles)',
    ['$i^2 = -1$', '$i^3 = -i$', '$i^4 = i$', '$(1 + i)^2 = 2i$'], ['a', 'b', 'd'],
    { a: '$i^2 = -1$ est la définition de $i$.', b: '$i^3 = i^2 \\times i = -i$.',
      c: '$i^4 = (i^2)^2 = (-1)^2 = 1$, et non $i$.', d: '$(1+i)^2 = 1 + 2i + i^2 = 2i$.' },
    '$i^4 = 1$ ; les trois autres égalités sont vraies.',
    'Calculez $i^4$ à partir de $i^2 = -1$.', true),
  qcm('L02-E1', 'L02', 'Conjugué', 'Quel est le conjugué de $z = -2 + 5i$ ?',
    ['$-2 - 5i$', '$2 - 5i$', '$2 + 5i$', '$-2 + 5i$'], ['a'],
    { b: 'Seul le signe de la partie imaginaire change : la partie réelle reste $-2$.',
      c: 'C’est l’opposé de $z$, pas son conjugué.', d: 'C’est $z$ lui-même.' },
    '$\\overline{z} = -2 - 5i$.', 'Le conjugué change le signe de la partie imaginaire uniquement.'),
  numeric('L02-E2', 'L02', 'Module', 'Calculer $|5 - 12i|$.', 'real', 13,
    '$|5-12i| = \\sqrt{25 + 144} = \\sqrt{169} = 13$.', 'Utilisez $|a + bi| = \\sqrt{a^2 + b^2}$.', 'ex. 13'),
  numeric('L02-E3', 'L02', 'Quotient', 'Écrire $\\dfrac{1}{1 + i}$ sous forme algébrique.', 'complex',
    { re: 0.5, im: -0.5 },
    '$\\dfrac{1}{1+i} = \\dfrac{1-i}{(1+i)(1-i)} = \\dfrac{1-i}{2} = \\dfrac12 - \\dfrac12 i$.',
    'Multipliez numérateur et dénominateur par le conjugué du dénominateur.', 'ex. 1/2 - 1/2 i'),
]

export const mockExercises = new Map(exercises.map((e) => [e.exercise.id, e]))

const ex = (id: string): Step => ({ type: 'EXERCISE', exercise: mockExercises.get(id)!.exercise })

const soon = (id: string): Step[] => [{
  type: 'EXPLANATION', title: 'Contenu en cours de rédaction',
  body: `Le contenu de cette leçon (${id}) sera ajouté au jalon (h). Cette étape sert uniquement à montrer le parcours.`,
}]

export const mockLessons: MockLesson[] = [
  { id: 'L01', part: 1, kind: 'LESSON', title: 'L’ensemble ℂ et la forme algébrique', steps: [
    { type: 'EXPLANATION', title: 'Pourquoi un nouvel ensemble de nombres ?',
      body: 'Dans $\\mathbb{R}$, l’équation $x^2 = -1$ n’a pas de solution, car un carré réel est toujours positif ou nul. On introduit donc un nombre, noté $i$, tel que $i^2 = -1$.\n\nL’ensemble $\\mathbb{C}$ des nombres complexes contient $\\mathbb{R}$ et ce nombre $i$ ; on y calcule avec les mêmes règles que dans $\\mathbb{R}$, en remplaçant $i^2$ par $-1$.',
      example: { statement: 'Résoudre dans $\\mathbb{C}$ l’équation $x^2 = -9$.',
        solution: 'On écrit $-9 = 9\\times(-1) = (3i)^2$, donc $x = 3i$ ou $x = -3i$.' } },
    { type: 'EXPLANATION', title: 'Forme algébrique',
      body: 'Tout nombre complexe $z$ s’écrit de façon unique $z = a + bi$ avec $a$ et $b$ réels.\n\n- $a$ est la **partie réelle** : $\\operatorname{Re}(z) = a$ ;\n- $b$ est la **partie imaginaire** : $\\operatorname{Im}(z) = b$ (un réel, sans le $i$).\n\nDeux nombres complexes sont égaux si et seulement si ils ont la même partie réelle et la même partie imaginaire.',
      example: { statement: 'Donner les parties réelle et imaginaire de $z = 3 - 5i$.',
        solution: '$z = 3 + (-5)\\,i$ donc $\\operatorname{Re}(z) = 3$ et $\\operatorname{Im}(z) = -5$.' } },
    ex('L01-E1'), ex('L01-E2'),
    { type: 'EXPLANATION', title: 'Somme et produit',
      body: 'Pour $z = a + bi$ et $z\' = c + di$ :\n\n$$z + z\' = (a + c) + (b + d)\\,i$$\n\n$$z \\times z\' = (ac - bd) + (ad + bc)\\,i$$\n\nOn développe comme dans $\\mathbb{R}$ puis on remplace $i^2$ par $-1$.',
      example: { statement: 'Calculer $(2 + 3i)(1 - i)$.',
        solution: '$(2+3i)(1-i) = 2 - 2i + 3i - 3i^2 = 2 + i + 3 = 5 + i$.' } },
    ex('L01-E3'), ex('L01-E4'), ex('L01-E5'),
  ] },
  { id: 'L02', part: 1, kind: 'LESSON', title: 'Conjugué et module d’un nombre complexe', steps: [
    { type: 'EXPLANATION', title: 'Conjugué et module',
      body: 'Le **conjugué** de $z = a + bi$ est $\\overline{z} = a - bi$. On a $z\\,\\overline{z} = a^2 + b^2$.\n\nLe **module** de $z$ est le réel positif $|z| = \\sqrt{a^2 + b^2}$, donc $|z|^2 = z\\,\\overline{z}$.\n\nPour écrire un quotient sous forme algébrique, on multiplie le numérateur et le dénominateur par le conjugué du dénominateur.',
      example: { statement: 'Pour $z = 3 + 4i$, calculer $\\overline{z}$ et $|z|$.',
        solution: '$\\overline{z} = 3 - 4i$ et $|z| = \\sqrt{9 + 16} = 5$.' } },
    ex('L02-E1'), ex('L02-E2'), ex('L02-E3'),
  ] },
  { id: 'L03', part: 1, kind: 'LESSON', title: 'Plan complexe : affixe d’un point et d’un vecteur', steps: soon('L03') },
  { id: 'L04', part: 1, kind: 'LESSON', title: 'Équations du second degré dans ℂ', steps: soon('L04') },
  { id: 'B1', part: 1, kind: 'BOSS', title: 'Exercice final — Partie 1', steps: soon('B1') },
  { id: 'L05', part: 2, kind: 'LESSON', title: 'Forme trigonométrique et argument', steps: soon('L05') },
  { id: 'L06', part: 2, kind: 'LESSON', title: 'Notation exponentielle, Moivre et Euler', steps: soon('L06') },
  { id: 'L07', part: 2, kind: 'LESSON', title: 'Applications géométriques', steps: soon('L07') },
  { id: 'B2', part: 2, kind: 'BOSS', title: 'Exercice final — Partie 2', steps: soon('B2') },
]
