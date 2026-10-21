import { useSyncExternalStore } from 'react'

const TOKEN_KEY = 'bac-token'
const NAME_KEY = 'bac-name'
const listeners = new Set<() => void>()

/** VITE_USE_MOCK=true runs the UI on the in-browser demo data with no login. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export const getToken = () => read(TOKEN_KEY)
export const getName = () => read(NAME_KEY)

export function setSession(token: string, name: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(NAME_KEY, name)
  } catch { /* storage unavailable: session lasts until reload only */ }
  listeners.forEach((l) => l())
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
  } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

export function useAuthenticated(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => USE_MOCK || getToken() !== null,
  )
}
