import { useRef, useState, type ChangeEvent } from 'react'
import { api, assetUrl } from '../api'

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'lines' | 'rows' | 'image'

export type Field = {
  /** Where the value lives in the form's data. Dots go into nested objects: "hero.title". */
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  required?: boolean
  wide?: boolean
  hint?: string
  placeholder?: string
  maxLength?: number
  /** textarea / lines: visible rows */
  rows?: number
  /** rows: the fields of one row, the word for a row, a blank row, and how many are allowed */
  columns?: Field[]
  noun?: string
  blank?: Record<string, unknown>
  max?: number
}

type Obj = Record<string, unknown>

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => (cur && typeof cur === 'object' ? (cur as Obj)[key] : undefined), obj)
}

/** A copy of `obj` with the value at `path` replaced. Nothing is changed in place. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.')
  const base = (obj && typeof obj === 'object' ? obj : {}) as Obj
  return { ...base, [head]: rest.length ? setPath(base[head], rest.join('.'), value) : value } as T
}

/** Before saving: trim list entries, and drop blank lines and rows that were left completely empty. */
export function tidy<T>(value: T): T {
  if (Array.isArray(value)) {
    const items = value.map(tidy).filter((item) => {
      if (typeof item === 'string') return item !== ''
      if (item && typeof item === 'object') {
        return Object.values(item as Obj).some((v) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : false))
      }
      return true
    })
    return items.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '') as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Obj).map(([k, v]) => [k, tidy(v)])) as T
  }
  return value
}

type InputProps = { field: Field; value: unknown; onChange: (v: unknown) => void; idPrefix?: string }

export function FieldInput({ field: f, value, onChange, idPrefix = '' }: InputProps) {
  const id = `fld-${idPrefix}${f.key.replace(/\./g, '-')}`
  const hintId = f.hint ? `${id}-hint` : undefined

  if (f.type === 'checkbox') {
    return (
      <label className={`check${f.wide ? ' wide' : ''}`} htmlFor={id}>
        <input id={id} type="checkbox" role="switch" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} aria-describedby={hintId} />
        <span>{f.label}</span>
        {f.hint && <small id={hintId}>{f.hint}</small>}
      </label>
    )
  }
  if (f.type === 'rows') return <RowsInput field={f} value={value} onChange={onChange} id={id} />
  if (f.type === 'image') return <ImageInput field={f} value={value} onChange={onChange} id={id} />

  const common = { id, required: f.required, placeholder: f.placeholder, maxLength: f.maxLength, 'aria-describedby': hintId }
  return (
    <div className={`field${f.wide || f.type === 'textarea' || f.type === 'lines' ? ' wide' : ''}`}>
      <label htmlFor={id}>{f.label}</label>
      {f.type === 'textarea' ? (
        <textarea {...common} rows={f.rows ?? 3} value={(value ?? '') as string} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === 'lines' ? (
        <textarea
          {...common}
          rows={f.rows ?? 4}
          value={Array.isArray(value) ? value.join('\n') : ''}
          onChange={(e) => onChange(e.target.value.split('\n'))}
        />
      ) : f.type === 'select' ? (
        <select {...common} value={(value ?? '') as string} onChange={(e) => onChange(e.target.value)}>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input {...common} type={f.type} value={(value ?? '') as string | number} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <small className="hint" id={hintId}>{f.hint}</small>}
    </div>
  )
}

// ---------- A list of rows (method steps, syllabus units, facts) ----------

function RowsInput({ field: f, value, onChange, id }: { field: Field; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const rows = (Array.isArray(value) ? value : []) as Obj[]
  const noun = f.noun ?? 'row'
  const full = f.max !== undefined && rows.length >= f.max

  const move = (i: number, by: number) => {
    const next = [...rows]
    const [row] = next.splice(i, 1)
    next.splice(i + by, 0, row)
    onChange(next)
  }

  return (
    <div className="rows wide" role="group" aria-labelledby={`${id}-label`}>
      <div className="rows-head">
        <span id={`${id}-label`} className="rows-label">{f.label}</span>
        {f.hint && <small className="hint">{f.hint}</small>}
      </div>
      {rows.length === 0 && <p className="adm-muted rows-empty">No {noun} yet.</p>}
      {rows.map((row, i) => (
        <div className="row-card" key={i}>
          <div className="row-tools">
            <span className="row-n">{String(i + 1).padStart(2, '0')}</span>
            <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${noun} ${i + 1} up`}>↑</button>
            <button type="button" className="icon-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${noun} ${i + 1} down`}>↓</button>
            <button type="button" className="icon-btn danger" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove ${noun} ${i + 1}`}>×</button>
          </div>
          <div className="adm-form-grid">
            {f.columns?.map((col) => (
              <FieldInput
                key={col.key}
                field={col}
                idPrefix={`${id}-${i}-`}
                value={row[col.key]}
                onChange={(v) => onChange(rows.map((r, j) => (j === i ? { ...r, [col.key]: v } : r)))}
              />
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-small" disabled={full} onClick={() => onChange([...rows, { ...(f.blank ?? {}) }])}>
        Add {noun}
      </button>
      {full && <small className="hint">That is the most that fit ({f.max}).</small>}
    </div>
  )
}

// ---------- An image: upload from the device, or paste a link ----------

const MAX_SIDE = 1000

/** Shrink a photo in the browser so uploads stay small and the page stays fast. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image.'))), 'image/jpeg', 0.86),
  )
}

function ImageInput({ field: f, value, onChange, id }: { field: Field; value: unknown; onChange: (v: unknown) => void; id: string }) {
  const url = (value ?? '') as string
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const blob = await shrink(file)
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      const res = await api<{ url: string }>(`/admin/media?filename=${encodeURIComponent(name)}`, {
        method: 'POST', admin: true, body: blob, headers: { 'Content-Type': 'image/jpeg' },
      })
      onChange(res.url)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not use that file. Choose a JPEG or PNG photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field wide image-field">
      <label htmlFor={id}>{f.label}</label>
      <div className="image-row">
        <div className="image-preview">
          {url ? <img src={assetUrl(url)} alt="Current photo" /> : <span>No photo</span>}
        </div>
        <div className="image-side">
          <div className="image-actions">
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => picker.current?.click()}>
              {busy ? 'Uploading…' : url ? 'Replace photo' : 'Upload photo'}
            </button>
            {url && <button type="button" className="link-btn" onClick={() => onChange('')}>Remove</button>}
          </div>
          <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
          <input id={id} type="text" value={url} placeholder="or paste an image link" maxLength={f.maxLength} onChange={(e) => onChange(e.target.value)} />
          {error && <small className="hint is-error" role="alert">{error}</small>}
          {f.hint && <small className="hint">{f.hint}</small>}
        </div>
      </div>
    </div>
  )
}
