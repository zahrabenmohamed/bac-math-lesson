import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { clearSession, getName, USE_MOCK } from '../lib/auth'
import { BoltIcon, FlameIcon } from './Icons'

type Theme = 'light' | 'dark' | 'system'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('theme') as Theme) || 'system' } catch { return 'system' }
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, setTheme] as const
}

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:text-text'}`

export function Layout() {
  const [theme, setTheme] = useTheme()
  const qc = useQueryClient()
  const { pathname } = useLocation()
  const { data } = useQuery({ queryKey: ['progress'], queryFn: api.getProgress })
  const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const label = { light: 'Clair', dark: 'Sombre', system: 'Auto' }[theme]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="font-semibold tracking-tight">
            <span className="font-mono text-brand">∑</span> Maths 2 Bac
          </NavLink>
          <nav aria-label="Navigation principale" className="flex gap-1">
            <NavLink to="/" end className={({ isActive }) => link({ isActive: isActive || pathname.startsWith('/chapitres') })}>Programme</NavLink>
            <NavLink to="/erreurs" className={link}>Mes erreurs</NavLink>
            <NavLink to="/profil" className={link}>Profil</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-muted" title="Série quotidienne">
              <FlameIcon /> <span className="font-mono">{data?.streakDays ?? 0}</span> j
            </span>
            <span className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-medium text-on-accent"
              title={`Niveau ${data?.level ?? 1}`}>
              <BoltIcon /> <span className="font-mono">{data?.xp ?? 0}</span> XP
            </span>
            {!USE_MOCK && (
              <button type="button" onClick={() => { clearSession(); qc.clear() }}
                className="rounded-md px-2 py-1 text-muted hover:text-text" title={getName() ?? undefined}>
                Déconnexion
              </button>
            )}
            <button type="button" onClick={() => setTheme(next)}
              className="rounded-md border border-line px-2 py-1 text-muted hover:text-text"
              aria-label={`Thème : ${label}. Changer.`}>
              {label}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
