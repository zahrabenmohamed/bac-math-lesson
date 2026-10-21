import {
  createContext, useContext, useId, useRef, useState,
  type KeyboardEvent, type PointerEvent, type ReactNode,
} from 'react'
import { Tex } from '../lib/Rich'
import type { C } from './math'

const PAD = 0.95

interface PlaneCtx {
  /** Scale of text, dots and arrow heads: 1 for a plane of range 5, smaller for smaller planes. */
  u: number
  range: number
  snap: number
  toMath: (e: { clientX: number; clientY: number }) => C
  snapPoint: (z: C) => C
}

const Ctx = createContext<PlaneCtx | null>(null)

function usePlane(): PlaneCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Plane children must be rendered inside <Plane>')
  return ctx
}

/** Math coordinates (re, im) -> SVG coordinates (y axis points down in SVG). */
const sx = (z: C) => z.re
const sy = (z: C) => -z.im

export const COLORS = {
  brand: 'var(--brand)',
  a: 'var(--viz-a)',
  b: 'var(--viz-b)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  line: 'var(--line)',
}

interface PlaneProps {
  range?: number
  snap?: number
  label: string
  children: ReactNode
  /** Clicking the background places a point (used by the PLOT exercise). */
  onPlace?: (z: C) => void
  onKeyDown?: (e: KeyboardEvent<SVGSVGElement>) => void
  tabIndex?: number
}

/** Complex plane: SVG with grid and axes. The origin is the centre; 1 unit = 1 grid square. */
export function Plane({ range = 5, snap = 0.5, label, children, onPlace, onKeyDown, tabIndex }: PlaneProps) {
  const ref = useRef<SVGSVGElement>(null)
  const V = 2 * range + 2 * PAD
  const R = Math.floor(range)
  const u = V / 11.9

  const toMath: PlaneCtx['toMath'] = (e) => {
    const r = ref.current?.getBoundingClientRect()
    const w = r?.width || 1
    const h = r?.height || 1
    return { re: (((e.clientX - (r?.left ?? 0)) / w) - 0.5) * V, im: -(((e.clientY - (r?.top ?? 0)) / h) - 0.5) * V }
  }
  const clampSnap = (x: number) => {
    const v = Math.max(-range, Math.min(range, Math.round(x / snap) * snap))
    return v === 0 ? 0 : v
  }
  const snapPoint = (z: C): C => ({ re: clampSnap(z.re), im: clampSnap(z.im) })

  const ticks = Array.from({ length: 2 * R + 1 }, (_, i) => i - R)
  const showTicks = R <= 8

  return (
    <Ctx.Provider value={{ u, range, snap, toMath, snapPoint }}>
      <svg
        ref={ref}
        viewBox={`${-V / 2} ${-V / 2} ${V} ${V}`}
        role="group"
        aria-label={label}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        onPointerDown={onPlace ? (e) => onPlace(snapPoint(toMath(e))) : undefined}
        className="aspect-square w-full max-w-[440px] touch-none select-none overflow-hidden rounded-xl border border-line bg-bg"
        style={{ cursor: onPlace ? 'crosshair' : undefined }}
      >
        {ticks.map((i) => (
          <g key={i} aria-hidden="true">
            <line x1={i} y1={-range} x2={i} y2={range} stroke={i === 0 ? COLORS.muted : COLORS.line}
              strokeWidth={i === 0 ? 1.6 : 1} vectorEffect="non-scaling-stroke" />
            <line x1={-range} y1={-i} x2={range} y2={-i} stroke={i === 0 ? COLORS.muted : COLORS.line}
              strokeWidth={i === 0 ? 1.6 : 1} vectorEffect="non-scaling-stroke" />
            {showTicks && i !== 0 && (
              <>
                <text x={i} y={0.62 * u} textAnchor="middle" fontSize={0.4 * u} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace">{i}</text>
                <text x={-0.2 * u} y={-i + 0.14 * u} textAnchor="end" fontSize={0.4 * u} fill={COLORS.muted} fontFamily="IBM Plex Mono, monospace">{i}</text>
              </>
            )}
          </g>
        ))}
        <text x={range + 0.1 * u} y={-0.25 * u} textAnchor="end" fontSize={0.45 * u} fill={COLORS.muted} aria-hidden="true">Re</text>
        <text x={0.25 * u} y={-range + 0.45 * u} fontSize={0.45 * u} fill={COLORS.muted} aria-hidden="true">Im</text>
        {children}
      </svg>
    </Ctx.Provider>
  )
}

interface SegProps { a: C; b: C; color?: string; dashed?: boolean; arrow?: boolean; width?: number }

export function Seg({ a, b, color = COLORS.brand, dashed, arrow, width = 2.2 }: SegProps) {
  const { u } = usePlane()
  const dx = sx(b) - sx(a)
  const dy = sy(b) - sy(a)
  const L = Math.hypot(dx, dy)
  let head: string | null = null
  if (arrow && L > 0.45 * u) {
    const ux = dx / L
    const uy = dy / L
    const bx = sx(b) - ux * 0.38 * u
    const by = sy(b) - uy * 0.38 * u
    head = `${sx(b)},${sy(b)} ${bx - uy * 0.17 * u},${by + ux * 0.17 * u} ${bx + uy * 0.17 * u},${by - ux * 0.17 * u}`
  }
  return (
    <g aria-hidden="true">
      <line x1={sx(a)} y1={sy(a)} x2={sx(b)} y2={sy(b)} stroke={color} strokeWidth={width}
        strokeDasharray={dashed ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />
      {head && <polygon points={head} fill={color} />}
    </g>
  )
}

/** Circle arc of radius r around `center` from angle `from` to `to` (radians, counter-clockwise positive). */
export function Arc({ r, from, to, center = { re: 0, im: 0 }, color = COLORS.brand }: { r: number; from: number; to: number; center?: C; color?: string }) {
  const delta = to - from
  if (Math.abs(delta) < 1e-6) return null
  const pt = (t: number) => `${center.re + r * Math.cos(t)} ${-(center.im + r * Math.sin(t))}`
  const large = Math.abs(delta) > Math.PI ? 1 : 0
  const sweep = delta > 0 ? 0 : 1
  return (
    <path aria-hidden="true" d={`M ${pt(from)} A ${r} ${r} 0 ${large} ${sweep} ${pt(to)}`} fill="none" stroke={color}
      strokeWidth={2} vectorEffect="non-scaling-stroke" />
  )
}

export function Ring({ center = { re: 0, im: 0 }, r, color = COLORS.muted, dashed = true }: { center?: C; r: number; color?: string; dashed?: boolean }) {
  return (
    <circle aria-hidden="true" cx={sx(center)} cy={sy(center)} r={r} fill="none" stroke={color} strokeWidth={1.4}
      strokeDasharray={dashed ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />
  )
}

/** A fixed (non draggable) point with a label. */
export function Dot({ z, label, color = COLORS.brand, shape = 'circle' }: { z: C; label?: string; color?: string; shape?: 'circle' | 'diamond' }) {
  const { u } = usePlane()
  return (
    <g aria-hidden="true">
      {shape === 'circle' ? (
        <circle cx={sx(z)} cy={sy(z)} r={0.2 * u} fill={color} stroke="var(--bg)" strokeWidth={0.06 * u} />
      ) : (
        <rect x={sx(z) - 0.18 * u} y={sy(z) - 0.18 * u} width={0.36 * u} height={0.36 * u} fill={color} stroke="var(--bg)" strokeWidth={0.06 * u}
          transform={`rotate(45 ${sx(z)} ${sy(z)})`} />
      )}
      {label && (
        <text x={sx(z) + 0.3 * u} y={sy(z) - 0.3 * u} fontSize={0.5 * u} fontWeight={600} fill={color}
          style={{ paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 0.12 * u }}>{label}</text>
      )}
    </g>
  )
}

const KEY_DELTA: Record<string, [number, number]> = {
  ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
}

interface DragProps {
  z: C
  onMove: (z: C) => void
  label: string
  /** Accessible name, e.g. "Point z". */
  name: string
  color?: string
  /** Rejects positions (e.g. to keep a result inside the plane). */
  accept?: (z: C) => boolean
}

/** Point draggable with the pointer or moved with the arrow keys (one grid step per key press). */
export function DraggablePoint({ z, onMove, label, name, color = COLORS.brand, accept }: DragProps) {
  const ctx = usePlane()
  const u = ctx.u
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const id = useId()

  const move = (p: C) => {
    if (p.re === z.re && p.im === z.im) return
    if (accept && !accept(p)) return
    onMove(p)
  }

  const onPointerDown = (e: PointerEvent<SVGGElement>) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.currentTarget.focus?.()
    setDragging(true)
  }
  const onPointerMove = (e: PointerEvent<SVGGElement>) => {
    if (dragging) move(ctx.snapPoint(ctx.toMath(e)))
  }
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    const d = KEY_DELTA[e.key]
    if (!d) return
    e.preventDefault()
    e.stopPropagation()
    move(ctx.snapPoint({ re: z.re + d[0] * ctx.snap, im: z.im + d[1] * ctx.snap }))
  }

  const text = `${name} : partie réelle ${z.re}, partie imaginaire ${z.im}. Flèches du clavier pour déplacer.`
  return (
    <g
      tabIndex={0}
      role="application"
      aria-roledescription="point déplaçable"
      aria-label={text}
      data-testid={`point-${label}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ cursor: dragging ? 'grabbing' : 'grab', outline: 'none' }}
    >
      <circle cx={sx(z)} cy={sy(z)} r={0.7 * u} fill="transparent" />
      {focused && <circle cx={sx(z)} cy={sy(z)} r={0.42 * u} fill="none" stroke="var(--text)" strokeWidth={0.07 * u} />}
      <circle cx={sx(z)} cy={sy(z)} r={0.25 * u} fill={color} stroke="var(--bg)" strokeWidth={0.07 * u} aria-labelledby={id} />
      <text id={id} x={sx(z) + 0.34 * u} y={sy(z) - 0.34 * u} fontSize={0.52 * u} fontWeight={600} fill={color}
        style={{ paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 0.13 * u }} aria-hidden="true">{label}</text>
    </g>
  )
}

/** Card shared by all widgets: title, instruction, plane + readout area, reset button. */
export function WidgetFrame({ title, instruction, onReset, plane, children }: {
  title: string
  instruction: string
  onReset?: () => void
  plane: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={`Activité interactive : ${title}`} className="mt-6 rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Explorer · {title}</h2>
        {onReset && (
          <button type="button" onClick={onReset} className="text-sm text-muted underline underline-offset-4 hover:text-text">
            Réinitialiser
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">{instruction}</p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,440px)_1fr]">
        <div>{plane}</div>
        <div className="space-y-2 text-sm" aria-live="polite">{children}</div>
      </div>
    </section>
  )
}

/** One line of the readout: a label and a formula. */
export function Line({ tex }: { tex: string }) {
  return <p className="overflow-x-auto rounded-md bg-bg px-3 py-1.5"><Tex tex={tex} /></p>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mr-4 inline-flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--brand)]" />
      {label}
    </label>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, valueText }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; valueText?: string
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-28 shrink-0">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        aria-valuetext={valueText} onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-[var(--brand)]" />
      <span className="w-20 shrink-0 text-right font-mono text-xs text-muted">{valueText ?? value}</span>
    </div>
  )
}

export const O: C = { re: 0, im: 0 }

/** Small text annotation anchored at a point of the plane. */
export function Tag({ at, text, color = COLORS.muted, dx = 0.12, dy = -0.14, anchor = 'start' }: {
  at: C; text: string; color?: string; dx?: number; dy?: number; anchor?: 'start' | 'middle' | 'end'
}) {
  const { u } = usePlane()
  return (
    <text aria-hidden="true" x={sx(at) + dx * u} y={sy(at) + dy * u} fontSize={0.42 * u} fill={color} textAnchor={anchor}
      style={{ paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 0.12 * u }}>{text}</text>
  )
}
