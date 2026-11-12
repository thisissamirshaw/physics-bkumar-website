import type { Program, SectionHead as Head } from '../types'
import SectionHead, { blockClass } from './SectionHead'

type Props = { programs?: Program[]; head: Head; flush: boolean; linkTo: string | null }

export default function Programs({ programs, head, flush, linkTo }: Props) {
  if (programs?.length === 0) return null
  return (
    <section className={blockClass(flush)} id="programs">
      <div className="wrap">
        <SectionHead head={head} />
        <div className="programs">
          {(programs ?? [null, null, null]).map((p, i) =>
            p ? (
              <article className="program" key={p.id}>
                <div className="program-top">
                  <span className="program-code">{p.code}</span>
                  {p.duration && <span className="tag">{p.duration}</span>}
                </div>
                <h3>{p.title}</h3>
                {p.summary && <p>{p.summary}</p>}
                <dl className="spec">
                  {p.focus && <div><dt>Focus</dt><dd>{p.focus}</dd></div>}
                  {p.classes && <div><dt>Classes</dt><dd>{p.classes}</dd></div>}
                  {p.tests && <div><dt>Tests</dt><dd>{p.tests}</dd></div>}
                </dl>
                {linkTo && (
                  <a className="more" href={linkTo} aria-label={`${linkTo === '#batches' ? 'View batches' : 'Book a demo'} for ${p.title}`}>
                    {linkTo === '#batches' ? 'View batches' : 'Book a demo'} <span className="arrow">→</span>
                  </a>
                )}
              </article>
            ) : (
              <article className="program is-loading" key={i} aria-hidden="true">
                <span className="skeleton" style={{ width: '40%' }} />
                <span className="skeleton tall" style={{ width: '70%' }} />
                <span className="skeleton" style={{ width: '100%' }} />
                <span className="skeleton" style={{ width: '85%' }} />
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
