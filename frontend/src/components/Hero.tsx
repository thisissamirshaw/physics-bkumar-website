import type { PageContent } from '../types'
import ProjectileCanvas from './ProjectileCanvas'

type Props = { hero: PageContent['hero']; loading: boolean; primaryHref: string; showSecondary: boolean }

export default function Hero({ hero, loading, primaryHref, showSecondary }: Props) {
  return (
    <section className={`hero${hero.show_simulation ? '' : ' no-lab'}`}>
      <div className="wrap hero-grid">
        <div className="hero-copy">
          {loading ? (
            // Until the real copy arrives, hold its space instead of flashing the starter text.
            <div className="hero-loading" aria-hidden="true">
              <span className="skeleton" style={{ width: '18ch' }} />
              <span className="skeleton h1" style={{ width: '90%' }} />
              <span className="skeleton h1" style={{ width: '60%' }} />
              <span className="skeleton" style={{ width: '32ch', maxWidth: '100%' }} />
              <span className="skeleton" style={{ width: '26ch', maxWidth: '100%' }} />
            </div>
          ) : (
            <>
              {hero.eyebrow && <span className="eyebrow">{hero.eyebrow}</span>}
              <h1>
                {hero.title} {hero.title_accent && <em>{hero.title_accent}</em>}
              </h1>
              {hero.lede && <p className="hero-lede">{hero.lede}</p>}
              <div className="hero-cta">
                {hero.cta_primary && (
                  <a className="btn btn-primary" href={primaryHref}>
                    {hero.cta_primary} <span className="arrow">→</span>
                  </a>
                )}
                {hero.cta_secondary && showSecondary && (
                  <a className="btn btn-ghost" href="#programs">{hero.cta_secondary}</a>
                )}
              </div>
              {hero.tracks.length > 0 && (
                <ul className="tracks" aria-label="Tracks offered">
                  {hero.tracks.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
        {hero.show_simulation && <ProjectileCanvas />}
      </div>
    </section>
  )
}
