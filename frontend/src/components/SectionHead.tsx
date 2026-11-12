import type { SectionHead as Head } from '../types'

/** The eyebrow / title / intro that opens a section. Parts left empty in the console are skipped. */
export default function SectionHead({ head, eyebrowExtra }: { head: Head; eyebrowExtra?: string }) {
  const eyebrow = [head.eyebrow, eyebrowExtra].filter(Boolean).join(' · ')
  if (!eyebrow && !head.title && !head.intro) return null
  return (
    <div className="sec-head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {head.title && <h2>{head.title}</h2>}
      {head.intro && <p>{head.intro}</p>}
    </div>
  )
}

export const blockClass = (flush: boolean, extra = '') => `block${flush ? ' flush-top' : ''}${extra ? ` ${extra}` : ''}`
