import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, json } from '../api'

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'

export type Field = {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  required?: boolean
  wide?: boolean
  hint?: string
}

export type Column<T> = { label: string; render: (row: T) => ReactNode; mono?: boolean }

export type CrudConfig<T extends { id: number }> = {
  title: string
  description: string
  path: string // e.g. "/admin/batches"
  noun: string // e.g. "batch"
  fields: Field[]
  columns: Column<T>[]
  blank: Omit<T, 'id'>
}

type Row = { id: number } & Record<string, unknown>

export default function CrudPanel<T extends { id: number }>(cfg: CrudConfig<T>) {
  const [rows, setRows] = useState<T[] | null>(null)
  const [editing, setEditing] = useState<(Partial<T> & { id?: number }) | null>(null)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [flash, setFlash] = useState('')

  const load = () =>
    api<T[]>(cfg.path, { admin: true })
      .then((r) => {
        setRows(r)
        setError('')
      })
      .catch((e: Error) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.path])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(''), 2500)
    return () => window.clearTimeout(id)
  }, [flash])

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const body: Record<string, unknown> = {}
    for (const f of cfg.fields) {
      const v = (editing as Record<string, unknown>)[f.key]
      if (f.required && (v === '' || v === undefined || v === null)) {
        setFormError(`${f.label} is required.`)
        return
      }
      body[f.key] = f.type === 'number' ? Number(v ?? 0) : v
    }
    setSaving(true)
    setFormError('')
    try {
      const isNew = editing.id === undefined
      await api(isNew ? cfg.path : `${cfg.path}/${editing.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        admin: true,
        body: json(body),
      })
      setEditing(null)
      setFlash(isNew ? `Added ${cfg.noun}.` : 'Saved.')
      load()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    try {
      await api(`${cfg.path}/${id}`, { method: 'DELETE', admin: true })
      setConfirmDelete(null)
      setFlash(`Deleted ${cfg.noun}.`)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const set = (key: string, value: unknown) => setEditing((cur) => (cur ? { ...cur, [key]: value } : cur))

  return (
    <section className="adm-panel">
      <header className="adm-head">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.description}</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => { setFormError(''); setEditing({ ...cfg.blank } as Partial<T>) }}>
          Add {cfg.noun}
        </button>
      </header>

      {error && <p className="adm-error" role="alert">{error}</p>}
      {flash && <p className="adm-flash" role="status">{flash}</p>}

      {rows === null ? (
        <p className="adm-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="adm-empty">No {cfg.noun} yet. Use “Add {cfg.noun}” to create the first one.</div>
      ) : (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                {cfg.columns.map((c) => <th key={c.label}>{c.label}</th>)}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cfg.columns.map((c) => <td key={c.label} className={c.mono ? 'mono' : ''}>{c.render(r)}</td>)}
                  <td className="actions">
                    {confirmDelete === r.id ? (
                      <span className="confirm">
                        <button type="button" className="danger" onClick={() => remove(r.id)}>Delete</button>
                        <button type="button" onClick={() => setConfirmDelete(null)}>Keep</button>
                      </span>
                    ) : (
                      <>
                        <button type="button" className="link-btn" onClick={() => { setFormError(''); setEditing({ ...r }) }}>Edit</button>
                        <button type="button" className="link-btn" onClick={() => setConfirmDelete(r.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="adm-sheet" role="dialog" aria-modal="true" aria-label={editing.id ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`}>
          <div className="adm-sheet-backdrop" onClick={() => setEditing(null)} />
          <form className="adm-sheet-body" onSubmit={save}>
            <h2>{editing.id ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`}</h2>
            <div className="adm-form-grid">
              {cfg.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={(editing as Row)[f.key]} onChange={(v) => set(f.key, v)} />
              ))}
            </div>
            {formError && <p className="adm-error" role="alert">{formError}</p>}
            <div className="adm-sheet-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

export function FieldInput({ field: f, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const id = `fld-${f.key}`
  if (f.type === 'checkbox') {
    return (
      <label className={`check${f.wide ? ' wide' : ''}`} htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>{f.label}</span>
        {f.hint && <small>{f.hint}</small>}
      </label>
    )
  }
  const common = { id, value: (value ?? '') as string | number, required: f.required }
  return (
    <div className={`field${f.wide || f.type === 'textarea' ? ' wide' : ''}`}>
      <label htmlFor={id}>{f.label}</label>
      {f.type === 'textarea' ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'select' ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input {...common} type={f.type} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <small className="hint">{f.hint}</small>}
    </div>
  )
}
