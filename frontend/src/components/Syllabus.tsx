import type { PageContent, SectionHead as Head } from '../types'
import SectionHead, { blockClass } from './SectionHead'

type Props = { head: Head; units: PageContent['syllabus']['units']; flush: boolean }

export default function Syllabus({ head, units, flush }: Props) {
  return (
    <section className={blockClass(flush)} id="syllabus">
      <div className="wrap">
        <SectionHead head={head} />
        <div className="units">
          {units.map((u, i) => (
            <div className="unit" key={i}>
              <h3 className="unit-name">
                {u.name}
                {u.grade && <small>{u.grade}</small>}
              </h3>
              <ul className="chips" aria-label={`${u.name} chapters`}>
                {u.chapters.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
