import { clearSession, getToken } from './auth'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.')
  }
  if (res.status === 401 && token) clearSession()
  if (!res.ok) {
    let message = 'Une erreur est survenue.'
    try { message = (await res.json()).error ?? message } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, message)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}
