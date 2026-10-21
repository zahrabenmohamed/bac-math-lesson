import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ReactNode } from 'react'

const TOKEN = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\*\*[^*]+\*\*)/g

function math(tex: string, display: boolean) {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' })
}

function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = text.split(TOKEN).map((p, i) => {
    if (p.startsWith('$$')) return <span key={i} dangerouslySetInnerHTML={{ __html: math(p.slice(2, -2), true) }} />
    if (p.startsWith('$')) return <span key={i} dangerouslySetInnerHTML={{ __html: math(p.slice(1, -1), false) }} />
    if (p.startsWith('**')) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
    return p
  })
  return <>{parts}</>
}

/** Inline-only variant (a single span): valid inside <label>, <legend>, buttons. */
export function RichInline({ text, id, className }: { text: string; id?: string; className?: string }) {
  return <span id={id} className={className}><Inline text={text} /></span>
}

/** Minimal rich text: paragraphs, "- " lists, **bold**, $inline$ and $$display$$ KaTeX. */
export function Rich({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n\n+/)
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => <li key={j}><Inline text={l.slice(2)} /></li>)}
            </ul>
          )
        }
        return <p key={i}><Inline text={b} /></p>
      })}
    </div>
  )
}
