import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api, json } from '../api'
import { FieldInput, type Field } from './fields'
import { ConfirmButton, Loading, PanelHead, useToast, useUnsaved } from './ui'

export type Column<T> = { label: string; render: (row: T) => ReactNode; mono?: boolean }

export type CrudConfig<T extends { id: number }> = {
  title: string
  description: string
  path: string // e.g. "/admin/batches"
  noun: string // e.g. "batch"
  plural: string // e.g. "batches"
  /** The field that names a row, for button labels: "Edit JEE Target". */
  nameKey: keyof T & string
  /** The true/false field that puts a row on the website, if the table has one. */
  visibleKey?: keyof T & string
  fields: Field[]
  columns: Column<T>[]
  blank: Omit<T, 'id' | 'sort_order'>
  /** Where the rows show on the website, e.g. "#batches". */
  preview: string
}

type Row = { id: number } & Record<string, unknown>
type Draft = Record<string, unknown> & { id?: number }

export default function CrudPanel<T extends { id: number }>(cfg: CrudConfig<T>) {
  const toast = useToast()
  const [rows, setRows] = useState<T[] | null>(null)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [original, setOriginal] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(
    () =>
      api<T[]>(cfg.path, { admin: true })
        .then((r) => {
          setRows(r)
          setError('')
        })
        .catch((e: Error) => setError(e.message)),
    [cfg.path],
  )
  useEffect(() => {
    load()
  }, [load])

  useUnsaved(editing !== null && JSON.stringify(editing) !== original)

  const open = (draft: Draft) => {
    setFormError('')
    setEditing(draft)
    setOriginal(JSON.stringify(draft))
  }
  const close = () => {
    if (JSON.stringify(editing) !== original && !window.confirm('Close without saving your changes?')) return
    setEditing(null)
  }

  // Escape closes the edit sheet.
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, original])

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const body: Record<string, unknown> = {}
    for (const f of cfg.fields) {
      const v = editing[f.key]
      if (f.required && (v === '' || v === undefined || v === null)) return setFormError(`${f.label} is required.`)
      body[f.key] = f.type === 'number' ? Number(v ?? 0) : typeof v === 'string' ? v.trim() : v
    }
    setSaving(true)
    setFormError('')
    try {
      const isNew = editing.id === undefined
      await api(isNew ? cfg.path : `${cfg.path}/${editing.id}`, { method: isNew ? 'POST' : 'PATCH', admin: true, body: json(body) })
      setEditing(null)
      toast(isNew ? `Added the ${cfg.noun}.` : 'Saved.')
      load()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function act(run: () => Promise<unknown>, done?: string) {
    try {
      await run()
      setError('')
      if (done) toast(done)
    } catch (err) {
      setError((err as Error).message)
    }
    load()
  }

  const remove = (row: Row) => act(() => api(`${cfg.path}/${row.id}`, { method: 'DELETE', admin: true }), `Deleted the ${cfg.noun}.`)

  const toggle = (row: Row) => {
    const key = cfg.visibleKey!
    const next = !row[key]
    setRows((cur) => cur?.map((r) => (r.id === row.id ? { ...r, [key]: next } : r)) ?? null) // show it at once
    return act(
      () => api(`${cfg.path}/${row.id}`, { method: 'PATCH', admin: true, body: json({ [key]: next }) }),
      next ? 'Now showing on the website.' : 'Hidden from the website.',
    )
  }

  const move = (index: number, by: number) => {
    if (!rows) return
    const next = [...rows]
    const [row] = next.splice(index, 1)
    next.splice(index + by, 0, row)
    setRows(next)
    return act(() => api(`${cfg.path}/reorder`, { method: 'POST', admin: true, body: json({ ids: next.map((r) => r.id) }) }))
  }

  const duplicate = (row: Row) => {
    const copy: Draft = {}
    for (const f of cfg.fields) copy[f.key] = row[f.key]
    copy[cfg.nameKey as string] = `${String(row[cfg.nameKey])} (copy)`
    if (cfg.visibleKey) copy[cfg.visibleKey as string] = false // a copy starts hidden until it has been edited
    open(copy)
  }

  const name = (row: Row) => String(row[cfg.nameKey])
  const shown = cfg.visibleKey && rows ? rows.filter((r) => (r as Row)[cfg.visibleKey!]).length : null

  return (
    <section className="adm-panel">
      <PanelHead
        title={cfg.title}
        actions={
          <>
            <a className="btn btn-ghost" href={`${import.meta.env.BASE_URL}?preview${cfg.preview}`} target="_blank" rel="noopener">See on website ↗</a>
            <button className="btn btn-primary" type="button" onClick={() => open({ ...cfg.blank })}>Add {cfg.noun}</button>
          </>
        }
      >
        {cfg.description}
      </PanelHead>

      {error && rows && <p className="adm-error" role="alert">{error}</p>}

      {rows === null ? (
        <Loading error={error} retry={load} />
      ) : rows.length === 0 ? (
        <div className="adm-empty">No {cfg.plural} yet. Use “Add {cfg.noun}” to create the first one.</div>
      ) : (
        <>
          <p className="adm-count">
            {rows.length} {rows.length === 1 ? cfg.noun : cfg.plural}
            {shown !== null && `, ${shown} on the website`}. Use the arrows to change the order on the page.
          </p>
          <div className="adm-table" tabIndex={0} role="region" aria-label={cfg.title}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  {cfg.columns.map((c) => <th scope="col" key={c.label}>{c.label}</th>)}
                  {cfg.visibleKey && <th scope="col">On site</th>}
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {(rows as unknown as Row[]).map((r, i) => (
                  <tr key={r.id} className={cfg.visibleKey && !r[cfg.visibleKey] ? 'is-hidden' : ''}>
                    <td className="order">
                      <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${name(r)} up`}>↑</button>
                      <button type="button" className="icon-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${name(r)} down`}>↓</button>
                    </td>
                    {cfg.columns.map((c) => <td key={c.label} className={c.mono ? 'mono' : ''}>{c.render(r as unknown as T)}</td>)}
                    {cfg.visibleKey && (
                      <td>
                        <button
                          type="button" role="switch" aria-checked={Boolean(r[cfg.visibleKey])} className="switch"
                          aria-label={`Show ${name(r)} on the website`} onClick={() => toggle(r)}
                        >
                          <span aria-hidden="true" />
                          {r[cfg.visibleKey] ? 'Shown' : 'Hidden'}
                        </button>
                      </td>
                    )}
                    <td className="actions">
                      <button type="button" className="link-btn" onClick={() => open({ ...r })} aria-label={`Edit ${name(r)}`}>Edit</button>
                      <button type="button" className="link-btn" onClick={() => duplicate(r)} aria-label={`Duplicate ${name(r)}`}>Copy</button>
                      <ConfirmButton onConfirm={() => remove(r)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <div className="adm-sheet" role="dialog" aria-modal="true" aria-label={editing.id ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`}>
          <div className="adm-sheet-backdrop" onClick={close} />
          <form className="adm-sheet-body" onSubmit={save} noValidate>
            <h2>{editing.id ? `Edit ${cfg.noun}` : `Add ${cfg.noun}`}</h2>
            <div className="adm-form-grid">
              {cfg.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={editing[f.key]} onChange={(v) => setEditing((cur) => (cur ? { ...cur, [f.key]: v } : cur))} />
              ))}
            </div>
            {formError && <p className="adm-error" role="alert">{formError}</p>}
            <div className="adm-sheet-actions">
              <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
