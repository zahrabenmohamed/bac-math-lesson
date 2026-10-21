import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom throws inside getComputedStyle for some MathML nodes produced by KaTeX, which breaks Testing
// Library's accessible-name computation. Fall back to <body>'s style (visible) for those elements only.
const originalGetComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
  try {
    return originalGetComputedStyle(element, pseudo)
  } catch {
    return originalGetComputedStyle(document.body)
  }
}) as typeof window.getComputedStyle
