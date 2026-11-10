import { useCallback, useEffect, useState } from 'react'
import { api, auth, json } from '../api'
import type { Enquiry, EnquiryStatus } from '../types'

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'closed', label: 'Closed' },
]

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Enquiries() {
  const [rows, setRows] = useState<Enquiry[] | null>(null)
  const [counts, setCounts] = useState<Record<EnquiryStatus, number> | null>(null)
  const [filter, setFilter] = useState<EnquiryStatus | 'all'>('new')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`
      const [list, summary] = await Promise.all([
        api<Enquiry[]>(`/admin/enquiries${q}`, { admin: true }),
        api<Record<EnquiryStatus, number>>('/admin/enquiries/summary', { admin: true }),
      ])
      setRows(list)
      setCounts(summary)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [filter])

  useEffect(() => {
    setRows(null)
    load()
    const id = window.setInterval(load, 30000) // pick up new enquiries without a refresh
    return () => window.clearInterval(id)
  }, [load])

  async function patch(id: number, body: Partial<Pick<Enquiry, 'status' | 'notes'>>) {
    try {
      const updated = await api<Enquiry>(`/admin/enquiries/${id}`, { method: 'PATCH', admin: true, body: json(body) })
      setRows((r) => r?.map((x) => (x.id === id ? updated : x)) ?? null)
      if (body.status) load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function remove(id: number) {
    try {
      await api(`/admin/enquiries/${id}`, { method: 'DELETE', admin: true })
      setConfirmDelete(null)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch('/api/admin/enquiries/export.csv', { headers: { Authorization: `Bearer ${auth.get()}` } })
      if (!res.ok) throw new Error('Export failed. Sign in again and retry.')
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement('a'), { href: url, download: 'enquiries.csv' })
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0

  return (
    <section className="adm-panel">
      <header className="adm-head">
        <div>
          <h1>Enquiries</h1>
          <p>Demo-class requests from the website. New ones appear here automatically.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={exportCsv}>Export CSV</button>
      </header>

      <div className="adm-filters" role="tablist">
        {[{ value: 'all' as const, label: 'All' }, ...STATUSES].map((s) => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={filter === s.value}
            className={filter === s.value ? 'on' : ''}
            onClick={() => setFilter(s.value)}
          >
            {s.label}
            <span className="count">{counts ? (s.value === 'all' ? total : counts[s.value]) : '·'}</span>
          </button>
        ))}
      </div>

      {error && <p className="adm-error" role="alert">{error}</p>}

      {rows === null ? (
        <p className="adm-muted">Loading enquiries…</p>
      ) : rows.length === 0 ? (
        <div className="adm-empty">
          {filter === 'new' ? 'No new enquiries. Requests from the demo-class form will show up here.' : 'Nothing in this list.'}
        </div>
      ) : (
        <ul className="enq-list">
          {rows.map((e) => (
            <li key={e.id} className={`enq s-${e.status}`}>
              <div className="enq-main">
                <div className="enq-top">
                  <strong>{e.name}</strong>
                  <span className="adm-muted">{when(e.created_at)}</span>
                </div>
                <div className="enq-meta">
                  <a href={`tel:+91${e.phone}`} className="mono">+91 {e.phone.slice(0, 5)} {e.phone.slice(5)}</a>
                  <a href={`https://wa.me/91${e.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <span className="pill">{e.student_class}</span>
                  <span className="pill">{e.target}</span>
                </div>
                {e.message && <p className="enq-msg">{e.message}</p>}
                <label className="enq-notes">
                  <span className="sr-only">Notes for {e.name}</span>
                  <textarea
                    rows={1}
                    defaultValue={e.notes}
                    placeholder="Add a note, e.g. called, demo on Saturday 5 pm"
                    onBlur={(ev) => ev.target.value !== e.notes && patch(e.id, { notes: ev.target.value })}
                  />
                </label>
              </div>
              <div className="enq-side">
                <label className="sr-only" htmlFor={`st-${e.id}`}>Status</label>
                <select id={`st-${e.id}`} value={e.status} onChange={(ev) => patch(e.id, { status: ev.target.value as EnquiryStatus })}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {confirmDelete === e.id ? (
                  <span className="confirm">
                    <button type="button" className="danger" onClick={() => remove(e.id)}>Delete</button>
                    <button type="button" onClick={() => setConfirmDelete(null)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" className="link-btn" onClick={() => setConfirmDelete(e.id)}>Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
