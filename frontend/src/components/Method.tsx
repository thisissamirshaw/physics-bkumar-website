import type { PageContent, SectionHead as Head } from '../types'
import SectionHead from './SectionHead'

/** `v² = u² + 2as` written between backticks in the console is set as a formula. */
function withFormulas(text: string) {
  return text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))
}

// The teaching order is a real sequence, so the steps are numbered.
export default function Method({ head, steps }: { head: Head; steps: PageContent['method']['steps'] }) {
  return (
    <section className="block method" id="method">
      <div className="wrap">
        <SectionHead head={head} />
        <ol className="steps" style={{ '--cols': Math.min(steps.length, 4) || 1 } as React.CSSProperties}>
          {steps.map((step, i) => (
            <li key={i}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              {step.text && <p>{withFormulas(step.text)}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
