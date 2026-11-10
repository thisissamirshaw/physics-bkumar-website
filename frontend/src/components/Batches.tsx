import { BATCH_STATUS_LABEL, type Batch } from '../types'

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Batches({ batches, session }: { batches?: Batch[]; session?: string }) {
  return (
    <section className="block flush-top" id="batches">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Batches{session ? ` · ${session}` : ''}</span>
          <h2>Upcoming batches</h2>
          <p>Seats are limited so every student gets attention. Book a demo class to reserve a seat.</p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Track</th>
                <th>Days</th>
                <th>Time</th>
                <th>Starts</th>
                <th>Seats</th>
              </tr>
            </thead>
            <tbody>
              {!batches &&
                [0, 1, 2].map((i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 6 }, (_, j) => (
                      <td key={j}><span className="skeleton" style={{ width: j ? '8ch' : '14ch' }} /></td>
                    ))}
                  </tr>
                ))}
              {batches?.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">New batches will be announced soon. Call us to join the waitlist.</td>
                </tr>
              )}
              {batches?.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.track}</td>
                  <td>{b.days}</td>
                  <td className="num">{b.time}</td>
                  <td className="num">{formatDate(b.starts_on)}</td>
                  <td>
                    <span className={`status ${b.status}`}>{BATCH_STATUS_LABEL[b.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
