import type { Testimonial } from '../types'

export default function Results({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="block flush-top" id="results">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Results</span>
          <h2>What students say</h2>
          <p>Scores and words from students who studied here.</p>
        </div>
        <div className="results">
          {testimonials.map((t) => (
            <article className="result" key={t.id}>
              <div className="result-score">
                <strong>{t.score}</strong>
                <span>{t.score_label}</span>
              </div>
              <p>{t.quote}</p>
              <footer>
                <span>
                  {t.student_name}
                  {t.year && `, ${t.year}`}
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
