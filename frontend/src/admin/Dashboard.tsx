import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Enquiry, EnquiryStatus } from '../types'
import { useSession } from './Admin'
import { Loading, PanelHead, plural, when, whenFull } from './ui'

type Stats = {
  enquiries: Record<EnquiryStatus, number> & { total: number; today: number; this_week: number; last_week: number; enrolled_rate: number | null }
  daily: { date: string; count: number }[]
  by_target: { label: string; count: number }[]
  by_class: { label: string; count: number }[]
  content: { programs: number; batches: number; batches_live: number; reviews: number; reviews_live: number }
  site: { maintenance: boolean; form_enabled: boolean; announcement: boolean }
  checklist: { label: string; done: boolean; to: string }[]
  recent: Enquiry[]
}

const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', opts)
}

/** Top of the y-axis: four equal steps of a round number, at or above the largest value. */
function axisTop(max: number): number {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2500, 5000]) {
    if (step * 4 >= max) return step * 4
  }
  return Math.ceil(max / 4000) * 4000
}

export default function Dashboard() {
  const { account } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    api<Stats>('/admin/stats', { admin: true })
      .then(setStats)
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    return () => window.clearInterval(id)
  }, [load])

  if (!stats)
    return (
      <section className="adm-panel">
        <PanelHead title="Dashboard" />
        <Loading error={error} retry={load} />
      </section>
    )

  const e = stats.enquiries
  const change = e.this_week - e.last_week
  const todo = stats.checklist.filter((c) => !c.done)

  return (
    <section className="adm-panel">
      <PanelHead title="Dashboard">
        Signed in as {account.email}.
        {account.last_login_at && ` Previous sign-in: ${whenFull(account.last_login_at)}.`}
      </PanelHead>

      {stats.site.maintenance && (
        <p className="adm-warn" role="status">
          The website is closed for maintenance. Visitors see only the maintenance message. <Link to="../status">Reopen it</Link>
        </p>
      )}

      <div className="tiles">
        <Link className="tile" to="../enquiries">
          <span className="tile-label">New enquiries to call</span>
          <strong className="tile-value">{e.new}</strong>
          <span className="tile-note">{e.new ? 'Open the list →' : 'All caught up'}</span>
        </Link>
        <div className="tile">
          <span className="tile-label">Enquiries, last 7 days</span>
          <strong className="tile-value">{e.this_week}</strong>
          <span className={`tile-note${change > 0 ? ' up' : change < 0 ? ' down' : ''}`}>
            {change === 0 ? 'Same as the 7 days before' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)} ${change > 0 ? 'more' : 'fewer'} than the 7 days before`}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Enquiries, all time</span>
          <strong className="tile-value">{e.total.toLocaleString('en-IN')}</strong>
          <span className="tile-note">{e.today ? `${e.today} today` : 'None today yet'}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Became students</span>
          <strong className="tile-value">{e.enrolled_rate === null ? '—' : `${e.enrolled_rate}%`}</strong>
          <span className="tile-note">{e.total ? `${e.enrolled} of ${e.total} enrolled` : 'No enquiries yet'}</span>
        </div>
      </div>

      <DailyChart daily={stats.daily} />

      <div className="dash-grid">
        <Breakdown title="Enquiries by target" rows={stats.by_target} />
        <Breakdown title="Enquiries by class" rows={stats.by_class} />
      </div>

      <div className="dash-grid">
        <div className="adm-card">
          <h2 className="card-title">Latest enquiries</h2>
          {stats.recent.length === 0 ? (
            <p className="adm-muted">No enquiries yet. They appear here when someone fills in the demo-class form.</p>
          ) : (
            <ul className="recent">
              {stats.recent.map((r) => (
                <li key={r.id}>
                  <span className={`dot s-${r.status}`} aria-hidden="true" />
                  <span className="recent-name">{r.name}</span>
                  <span className="adm-muted">{[r.target, r.status].filter(Boolean).join(' · ')}</span>
                  <span className="adm-muted mono">{when(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link className="card-link" to="../enquiries">All enquiries →</Link>
        </div>

        <div className="adm-card">
          <h2 className="card-title">Website right now</h2>
          <dl className="facts-list">
            <div><dt>Website</dt><dd>{stats.site.maintenance ? 'Closed for maintenance' : 'Open'}</dd></div>
            <div><dt>Enquiry form</dt><dd>{stats.site.form_enabled ? 'Taking requests' : 'Paused'}</dd></div>
            <div><dt>Announcement strip</dt><dd>{stats.site.announcement ? 'Showing' : 'Off'}</dd></div>
            <div><dt>Programs</dt><dd>{stats.content.programs}</dd></div>
            <div><dt>Batches shown</dt><dd>{stats.content.batches_live} of {stats.content.batches}</dd></div>
            <div><dt>Reviews shown</dt><dd>{stats.content.reviews_live} of {stats.content.reviews}</dd></div>
          </dl>
          <a className="card-link" href={`${import.meta.env.BASE_URL}?preview`} target="_blank" rel="noopener">View website ↗</a>
        </div>
      </div>

      {todo.length > 0 && (
        <div className="adm-card">
          <h2 className="card-title">Finish setting up</h2>
          <p className="adm-card-note">
            {plural(todo.length, 'thing')} on the website still {todo.length === 1 ? 'has its' : 'have their'} starter value.
          </p>
          <ul className="todo">
            {stats.checklist.map((c) => (
              <li key={c.label} className={c.done ? 'is-done' : ''}>
                <span className="todo-mark" aria-hidden="true">{c.done ? '✓' : ''}</span>
                {c.done ? <span>{c.label} <span className="sr-only">(done)</span></span> : <Link to={`../${c.to}`}>{c.label} →</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ---------- Enquiries per day: one series, so one colour and no legend ----------

function DailyChart({ daily }: { daily: Stats['daily'] }) {
  const [table, setTable] = useState(false)
  const max = Math.max(...daily.map((d) => d.count))
  const top = axisTop(Math.max(max, 1))
  const ticks = [4, 3, 2, 1, 0].map((i) => (top / 4) * i)
  const total = daily.reduce((sum, d) => sum + d.count, 0)
  const last = daily.length - 1

  return (
    <figure className="adm-card chart">
      <figcaption className="chart-head">
        <div>
          <h2 className="card-title">Enquiries per day</h2>
          <p className="adm-muted">Last 14 days, {plural(total, 'enquiry', 'enquiries')} in all.</p>
        </div>
        <button type="button" className="link-btn" aria-pressed={table} onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </figcaption>

      {table ? (
        <div className="adm-table chart-table">
          <table>
            <thead><tr><th scope="col">Day</th><th scope="col">Enquiries</th></tr></thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}><td>{dayLabel(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td className="mono">{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="plot" role="img" aria-label={`Bar chart of enquiries per day for the last 14 days. ${total} in all, the most in one day was ${max}.`}>
          <div className="plot-y" aria-hidden="true">
            {ticks.map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="plot-area">
            <div className="plot-grid" aria-hidden="true">
              {ticks.map((t) => <i key={t} />)}
            </div>
            <div className="plot-cols">
              {daily.map((d, i) => (
                <div className="plot-col" key={d.date} tabIndex={0}>
                  <span className="plot-tip" role="tooltip">
                    <b>{d.count}</b> {d.count === 1 ? 'enquiry' : 'enquiries'}
                    <small>{dayLabel(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</small>
                  </span>
                  {/* Only today's bar carries its number; the axis and the hover card cover the rest. */}
                  {i === last && d.count > 0 && <span className="plot-value" style={{ bottom: `${(d.count / top) * 100}%` }}>{d.count}</span>}
                  <span className="plot-bar" style={{ height: `${(d.count / top) * 100}%` }} />
                </div>
              ))}
            </div>
            {total === 0 && <p className="plot-empty">No enquiries in the last 14 days.</p>}
          </div>
          <div className="plot-x" aria-hidden="true">
            {daily.map((d, i) => (
              <span key={d.date}>{i === last ? 'Today' : (last - i) % 3 === 0 ? dayLabel(d.date) : ''}</span>
            ))}
          </div>
        </div>
      )}
    </figure>
  )
}

// ---------- Share of enquiries by one field: thin horizontal bars, value at the tip ----------

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return (
    <div className="adm-card">
      <h2 className="card-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="adm-muted">Nothing to show yet.</p>
      ) : (
        <ul className="hbars">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.count} of ${total} (${Math.round((100 * r.count) / total)}%)`}>
              <span className="hbar-label">{r.label}</span>
              <span className="hbar-track">
                <span className="hbar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
                <span className="hbar-value">{r.count}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
