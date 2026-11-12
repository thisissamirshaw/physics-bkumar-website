import { BATCH_STATUS_LABEL, type Batch, type SectionHead as Head } from '../types'
import SectionHead, { blockClass } from './SectionHead'

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string) {
  if (!iso) return ''
  return parse(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const started = (iso: string) => parse(iso).getTime() < new Date().setHours(0, 0, 0, 0)

type Props = {
  batches?: Batch[]
  session?: string
  head: Head
  flush: boolean
  /** Given when the enquiry form is on: each row gets a button that starts a request for that batch. */
  onPick?: (batch: string) => void
}

export default function Batches({ batches, session, head, flush, onPick }: Props) {
  const cols = onPick ? 7 : 6
  return (
    <section className={blockClass(flush)} id="batches">
      <div className="wrap">
        <SectionHead head={head} eyebrowExtra={session} />
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Batch timetable">
          <table>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">Track</th>
                <th scope="col">Days</th>
                <th scope="col">Time</th>
                <th scope="col">Starts</th>
                <th scope="col">Seats</th>
                {onPick && <th scope="col"><span className="sr-only">Book</span></th>}
              </tr>
            </thead>
            <tbody>
              {!batches &&
                [0, 1, 2].map((i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: cols }, (_, j) => (
                      <td key={j}><span className="skeleton" style={{ width: j ? '8ch' : '14ch' }} /></td>
                    ))}
                  </tr>
                ))}
              {batches?.length === 0 && (
                <tr>
                  <td colSpan={cols} className="empty">New batches will be announced soon. Call us to join the waitlist.</td>
                </tr>
              )}
              {batches?.map((b) => (
                <tr key={b.id}>
                  <th scope="row">{b.name}</th>
                  <td>{b.track}</td>
                  <td>{b.days}</td>
                  <td className="num">{b.time}</td>
                  <td className="num">
                    {formatDate(b.starts_on)}
                    {started(b.starts_on) && <span className="tag running">Running</span>}
                  </td>
                  <td>
                    <span className={`status ${b.status}`}>{BATCH_STATUS_LABEL[b.status]}</span>
                  </td>
                  {onPick && (
                    <td className="pick">
                      <a href="#visit" onClick={() => onPick(b.name)} aria-label={`${b.status === 'waitlist' ? 'Join the waitlist for' : 'Book a demo for'} ${b.name}`}>
                        {b.status === 'waitlist' ? 'Join waitlist' : 'Book demo'} <span className="arrow" aria-hidden="true">→</span>
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
