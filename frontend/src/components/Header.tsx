import { useEffect, useState } from 'react'
import type { PageContent, SectionKey } from '../types'

const LINKS: [SectionKey, string][] = [
  ['programs', 'Programs'],
  ['method', 'Method'],
  ['syllabus', 'Syllabus'],
  ['mentor', 'Mentor'],
  ['results', 'Results'],
  ['batches', 'Batches'],
  ['visit', 'Visit'],
]

type Props = { name?: string; branding: PageContent['branding']; shown: SectionKey[] }

export default function Header({ name = 'Physics by B. Kumar', branding, shown }: Props) {
  const [open, setOpen] = useState(false)
  const links = LINKS.filter(([key]) => shown.includes(key))
  const cta = shown.includes('visit') && branding.header_cta

  // The phone menu closes on Escape and when the window grows past the phone layout.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const wide = matchMedia('(min-width: 861px)')
    const onWide = () => wide.matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    wide.addEventListener('change', onWide)
    return () => {
      window.removeEventListener('keydown', onKey)
      wide.removeEventListener('change', onWide)
    }
  }, [open])

  return (
    <header className="site">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label={`${name}, home`}>
          <span className="brand-mark">{branding.brand_mark}</span>
          <span className="brand-name">
            {name}
            {branding.brand_sub && <small>{branding.brand_sub}</small>}
          </span>
        </a>
        <nav className="nav-links" aria-label="Main">
          {links.map(([key, label]) => (
            <a key={key} href={`#${key}`}>{label}</a>
          ))}
        </nav>
        <div className="nav-end">
          {cta && <a className="btn btn-primary" href="#visit">{cta}</a>}
          {links.length > 0 && (
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls="nav-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((o) => !o)}
            >
              <span className={`bars${open ? ' is-open' : ''}`} aria-hidden="true"><i /><i /><i /></span>
            </button>
          )}
        </div>
      </div>
      {open && (
        <nav className="nav-menu" id="nav-menu" aria-label="Main, phone">
          <div className="wrap">
            {links.map(([key, label]) => (
              <a key={key} href={`#${key}`} onClick={() => setOpen(false)}>{label}</a>
            ))}
            {cta && <a className="btn btn-primary" href="#visit" onClick={() => setOpen(false)}>{cta}</a>}
          </div>
        </nav>
      )}
    </header>
  )
}
