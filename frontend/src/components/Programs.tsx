import type { Program } from '../types'

export default function Programs({ programs }: { programs?: Program[] }) {
  return (
    <section className="block" id="programs">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Programs</span>
          <h2>One subject. Three ways to sit the exam.</h2>
          <p>
            The same physics underneath, with different depth, pace and question style for each exam. Pick the track
            that matches your target.
          </p>
        </div>
        <div className="programs">
          {(programs ?? [null, null, null]).map((p, i) =>
            p ? (
              <article className="program" key={p.id}>
                <div className="program-top">
                  <span className="program-code">{p.code}</span>
                  {p.duration && <span className="tag">{p.duration}</span>}
                </div>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
                <dl className="spec">
                  <div><dt>Focus</dt><dd>{p.focus}</dd></div>
                  <div><dt>Classes</dt><dd>{p.classes}</dd></div>
                  <div><dt>Tests</dt><dd>{p.tests}</dd></div>
                </dl>
                <a className="more" href="#batches">
                  View batches <span className="arrow">→</span>
                </a>
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
