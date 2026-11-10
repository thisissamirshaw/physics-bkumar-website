import type { SiteSettings } from '../types'

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function Mentor({ settings: s }: { settings: SiteSettings }) {
  return (
    <section className="block flush-top" id="mentor">
      <div className="wrap mentor">
        <div className="portrait">
          {s.mentor_photo_url ? (
            <img src={s.mentor_photo_url} alt={`Portrait of ${s.mentor_name}`} loading="lazy" />
          ) : (
            <span className="initials">{initials(s.mentor_name)}</span>
          )}
        </div>
        <div className="mentor-copy">
          <span className="eyebrow">Your teacher</span>
          <h2>{s.mentor_name}</h2>
          {s.mentor_quote && <blockquote>“{s.mentor_quote}”</blockquote>}
          <p>{s.mentor_bio}</p>
          {s.mentor_credentials.length > 0 && (
            <div className="creds">
              {s.mentor_credentials.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
