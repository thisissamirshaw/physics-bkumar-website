import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, download, json } from '../api'
import type { Enquiry, EnquiryStatus, PageContent } from '../types'
import { useSession } from './Admin'
import { ConfirmButton, Loading, PanelHead, plural, useToast, when } from './ui'

export const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'closed', label: 'Closed' },
]

type Filter = EnquiryStatus | 'all'
const BLANK = { name: '', phone: '', student_class: '', target: '', message: '', status: 'new' as EnquiryStatus, notes: '' }

export default function Enquiries() {
  const toast = useToast()
  const { refreshCounts } = useSession()
  const [rows, setRows] = useState<Enquiry[] | null>(null)
  const [counts, setCounts] = useState<Record<EnquiryStatus, number> | null>(null)
  const [filter, setFilter] = useState<Filter>('new')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('') // the search actually applied, a moment after typing stops
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<EnquiryStatus>('contacted')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<typeof BLANK | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<{ classes: string[]; targets: string[] }>({ classes: [], targets: [] })
  const latest = useRef(0)

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(search.trim()), 250)
    return () => window.clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    const ticket = ++latest.current
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (query) params.set('q', query)
      const [list, summary] = await Promise.all([
        api<Enquiry[]>(`/admin/enquiries?${params}`, { admin: true }),
        api<Record<EnquiryStatus, number>>('/admin/enquiries/summary', { admin: true }),
      ])
      if (ticket !== latest.current) return // a newer request is on its way
      setRows(list)
      setCounts(summary)
      setSelected((cur) => new Set(list.filter((e) => cur.has(e.id)).map((e) => e.id)))
      setError('')
      refreshCounts()
    } catch (e) {
      if (ticket === latest.current) setError((e as Error).message)
    }
  }, [filter, query, refreshCounts])

  useEffect(() => {
    setRows(null)
    load()
    const id = window.setInterval(load, 30000) // pick up new enquiries without a refresh
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    api<PageContent>('/admin/page', { admin: true })
      .then((p) => setOptions({ classes: p.form.classes, targets: p.form.targets }))
      .catch(() => {})
  }, [])

  async function run(action: () => Promise<unknown>, done?: string) {
    try {
      await action()
      if (done) toast(done)
    } catch (e) {
      setError((e as Error).message)
    }
    load()
  }

  async function patch(id: number, body: Partial<Pick<Enquiry, 'status' | 'notes'>>) {
    try {
      const updated = await api<Enquiry>(`/admin/enquiries/${id}`, { method: 'PATCH', admin: true, body: json(body) })
      setRows((r) => r?.map((x) => (x.id === id ? updated : x)) ?? null)
      if (body.status) {
        toast(`Marked ${STATUSES.find((s) => s.value === body.status)?.label.toLowerCase()}.`)
        load()
      } else toast('Note saved.')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const ids = [...selected]
  const bulk = (body: object, done: string) =>
    run(() => api('/admin/enquiries/bulk', { method: 'POST', admin: true, body: json({ ids, ...body }) }), done).then(() => setSelected(new Set()))

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!adding) return
    if (adding.name.trim().length < 2) return setFormError('Enter the student’s name.')
    setSaving(true)
    setFormError('')
    try {
      await api('/admin/enquiries', { method: 'POST', admin: true, body: json(adding) })
      setAdding(null)
      toast('Enquiry added.')
      load()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0
  const allSelected = rows !== null && rows.length > 0 && rows.every((e) => selected.has(e.id))
  const setField = (key: keyof typeof BLANK, value: string) => setAdding((cur) => (cur ? { ...cur, [key]: value } : cur))

  return (
    <section className="adm-panel">
      <PanelHead
        title="Enquiries"
        actions={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => download('/admin/enquiries/export.csv', 'enquiries.csv').catch((e: Error) => setError(e.message))}>
              Export CSV
            </button>
            <button className="btn btn-primary" type="button" onClick={() => { setFormError(''); setAdding({ ...BLANK }) }}>Add enquiry</button>
          </>
        }
      >
        Demo-class requests from the website. New ones appear here by themselves. Add phone and walk-in enquiries by hand.
      </PanelHead>

      <div className="adm-toolbar">
        <div className="adm-filters" role="group" aria-label="Filter by status">
          {[{ value: 'all' as const, label: 'All' }, ...STATUSES].map((s) => (
            <button key={s.value} type="button" aria-pressed={filter === s.value} className={filter === s.value ? 'on' : ''} onClick={() => setFilter(s.value)}>
              {s.label}
              <span className="count">{counts ? (s.value === 'all' ? total : counts[s.value]) : '·'}</span>
            </button>
          ))}
        </div>
        <label className="adm-search">
          <span className="sr-only">Search enquiries</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, notes" maxLength={80} />
        </label>
      </div>

      {error && <p className="adm-error" role="alert">{error}</p>}

      {rows === null ? (
        !error && <Loading />
      ) : rows.length === 0 ? (
        <div className="adm-empty">
          {query
            ? `Nothing matches “${query}”${filter === 'all' ? '' : ' in this list. Try “All”'}.`
            : filter === 'new'
              ? 'No new enquiries. Requests from the demo-class form will show up here.'
              : 'Nothing in this list.'}
        </div>
      ) : (
        <>
          <div className={`adm-bulk${selected.size ? ' is-active' : ''}`}>
            <label className="check">
              <input
                type="checkbox" checked={allSelected}
                onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
              />
              <span>{selected.size ? `${selected.size} selected` : `Select all ${rows.length}`}</span>
            </label>
            {selected.size > 0 && (
              <div className="adm-bulk-actions">
                <label className="sr-only" htmlFor="bulk-status">Mark selected as</label>
                <select id="bulk-status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as EnquiryStatus)}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>Mark {s.label.toLowerCase()}</option>)}
                </select>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => bulk({ action: 'status', status: bulkStatus }, `${plural(ids.length, 'enquiry', 'enquiries')} updated.`)}>
                  Apply
                </button>
                <ConfirmButton label="Delete selected" confirm={`Delete ${ids.length}`} onConfirm={() => bulk({ action: 'delete' }, `${plural(ids.length, 'enquiry', 'enquiries')} deleted.`)} />
              </div>
            )}
          </div>

          <ul className="enq-list">
            {rows.map((e) => (
              <li key={e.id} className={`enq s-${e.status}${selected.has(e.id) ? ' is-selected' : ''}`}>
                <input
                  type="checkbox" className="enq-pick" checked={selected.has(e.id)} aria-label={`Select ${e.name}`}
                  onChange={(ev) => setSelected((cur) => {
                    const next = new Set(cur)
                    if (ev.target.checked) next.add(e.id)
                    else next.delete(e.id)
                    return next
                  })}
                />
                <div className="enq-main">
                  <div className="enq-top">
                    <strong>{e.name}</strong>
                    <span className="adm-muted">{when(e.created_at)}</span>
                  </div>
                  <div className="enq-meta">
                    <a href={`tel:+91${e.phone}`} className="mono">+91 {e.phone.slice(0, 5)} {e.phone.slice(5)}</a>
                    <a href={`https://wa.me/91${e.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    {e.student_class && <span className="pill">{e.student_class}</span>}
                    {e.target && <span className="pill">{e.target}</span>}
                  </div>
                  {e.message && <p className="enq-msg">{e.message}</p>}
                  <label className="enq-notes">
                    <span className="sr-only">Notes for {e.name}</span>
                    <textarea
                      rows={1}
                      defaultValue={e.notes}
                      maxLength={2000}
                      placeholder="Add a note, e.g. called, demo on Saturday 5 pm"
                      onBlur={(ev) => ev.target.value !== e.notes && patch(e.id, { notes: ev.target.value })}
                    />
                  </label>
                </div>
                <div className="enq-side">
                  <label className="sr-only" htmlFor={`st-${e.id}`}>Status of {e.name}</label>
                  <select id={`st-${e.id}`} value={e.status} onChange={(ev) => patch(e.id, { status: ev.target.value as EnquiryStatus })}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ConfirmButton onConfirm={() => run(() => api(`/admin/enquiries/${e.id}`, { method: 'DELETE', admin: true }), 'Enquiry deleted.')} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {adding && (
        <div className="adm-sheet" role="dialog" aria-modal="true" aria-label="Add enquiry">
          <div className="adm-sheet-backdrop" onClick={() => setAdding(null)} />
          <form className="adm-sheet-body" onSubmit={add} noValidate>
            <h2>Add enquiry</h2>
            <div className="adm-form-grid">
              <div className="field">
                <label htmlFor="ne-name">Student name</label>
                <input id="ne-name" value={adding.name} maxLength={80} autoFocus onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ne-phone">Mobile number</label>
                <input id="ne-phone" type="tel" inputMode="tel" value={adding.phone} maxLength={16} placeholder="98765 43210" onChange={(e) => setField('phone', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ne-class">Class</label>
                <select id="ne-class" value={adding.student_class} onChange={(e) => setField('student_class', e.target.value)}>
                  <option value="">Not given</option>
                  {options.classes.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ne-target">Target</label>
                <select id="ne-target" value={adding.target} onChange={(e) => setField('target', e.target.value)}>
                  <option value="">Not given</option>
                  {options.targets.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field wide">
                <label htmlFor="ne-msg">What they asked</label>
                <textarea id="ne-msg" rows={2} value={adding.message} maxLength={500} onChange={(e) => setField('message', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ne-status">Status</label>
                <select id="ne-status" value={adding.status} onChange={(e) => setField('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="field wide">
                <label htmlFor="ne-notes">Your notes</label>
                <textarea id="ne-notes" rows={2} value={adding.notes} maxLength={2000} onChange={(e) => setField('notes', e.target.value)} />
              </div>
            </div>
            {formError && <p className="adm-error" role="alert">{formError}</p>}
            <div className="adm-sheet-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add enquiry'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
