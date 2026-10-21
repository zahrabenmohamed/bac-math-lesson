import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { setSession, useAuthenticated } from '../lib/auth'
import { authenticate } from '../lib/rest/api'

export function Login() {
  const authenticated = useAuthenticated()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (authenticated) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await authenticate(mode, email, password, name)
      setSession(res.token, res.displayName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-line bg-surface px-4 py-2.5'

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="font-mono text-4xl text-brand" aria-hidden="true">ℂ</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Les nombres complexes</h1>
      <p className="mb-6 text-sm text-muted">2ème Bac · Sciences physiques / SVT</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <h2 className="font-medium">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
        {mode === 'register' && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">Prénom ou pseudo</label>
            <input id="name" className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" required maxLength={80} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
          <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">Mot de passe</label>
          <input id="password" type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} aria-describedby="pw-help" />
          {mode === 'register' && <p id="pw-help" className="mt-1 text-sm text-muted">8 caractères minimum.</p>}
        </div>
        {error && <p role="alert" className="text-sm text-incorrect">{error}</p>}
        <button type="submit" disabled={busy}
          className="w-full rounded-lg bg-brand px-5 py-2.5 font-medium text-on-brand hover:opacity-90 disabled:opacity-50">
          {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <button type="button" className="mt-4 text-sm text-brand underline underline-offset-4"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}>
        {mode === 'login' ? 'Pas encore de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
      </button>
    </main>
  )
}
