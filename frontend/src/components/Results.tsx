import type { SectionHead as Head, Testimonial } from '../types'
import SectionHead, { blockClass } from './SectionHead'

export default function Results({ testimonials, head, flush }: { testimonials: Testimonial[]; head: Head; flush: boolean }) {
  return (
    <section className={blockClass(flush)} id="results">
      <div className="wrap">
        <SectionHead head={head} />
        <div className="results">
          {testimonials.map((t) => (
            <figure className="result" key={t.id}>
              {(t.score || t.score_label) && (
                <div className="result-score">
                  {t.score && <strong>{t.score}</strong>}
                  {t.score_label && <span>{t.score_label}</span>}
                </div>
              )}
              {t.quote && <blockquote>{t.quote}</blockquote>}
              <figcaption>
                {t.student_name}
                {t.year && `, ${t.year}`}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
