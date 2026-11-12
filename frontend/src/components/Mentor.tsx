import { assetUrl } from '../api'
import type { SectionHead as Head, SiteSettings } from '../types'
import { blockClass } from './SectionHead'

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function Mentor({ settings: s, head, flush }: { settings: SiteSettings; head: Head; flush: boolean }) {
  return (
    <section className={blockClass(flush)} id="mentor">
      <div className="wrap mentor">
        <div className="portrait">
          {s.mentor_photo_url ? (
            <img src={assetUrl(s.mentor_photo_url)} alt={`Portrait of ${s.mentor_name}`} loading="lazy" decoding="async" />
          ) : (
            <span className="initials" aria-hidden="true">{initials(s.mentor_name)}</span>
          )}
        </div>
        <div className="mentor-copy">
          {head.eyebrow && <span className="eyebrow">{head.eyebrow}</span>}
          <h2>{s.mentor_name}</h2>
          {s.mentor_quote && <blockquote>“{s.mentor_quote}”</blockquote>}
          {s.mentor_bio.split(/\n{2,}/).filter((para) => para.trim()).map((para, i) => <p key={i}>{para}</p>)}
          {s.mentor_credentials.length > 0 && (
            <ul className="creds">
              {s.mentor_credentials.map((c) => <li key={c}>{c}</li>)}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
