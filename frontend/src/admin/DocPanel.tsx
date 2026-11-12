import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, json } from '../api'
import { FieldInput, getPath, setPath, tidy, type Field } from './fields'
import { Loading, PanelHead, useToast, useUnsaved } from './ui'

export type DocGroup = { title: string; note?: string; fields: Field[] }

export type DocConfig = {
  /** "page" = homepage copy blocks, "settings" = contact details, teacher and facts. */
  source: 'page' | 'settings'
  title: string
  description: string
  groups: DocGroup[]
  /** Where on the website the result shows, e.g. "#method". */
  preview?: string
}

type Data = Record<string, unknown>

/** A form over one part of the site's content: load, edit, save. */
export default function DocPanel(cfg: DocConfig) {
  const toast = useToast()
  const path = `/admin/${cfg.source}`
  const [data, setData] = useState<Data | null>(null)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setError('')
    api<Data>(path, { admin: true })
      .then((d) => {
        setData(d)
        setSaved(JSON.stringify(d))
      })
      .catch((e: Error) => setError(e.message))
  }, [path])
  useEffect(load, [load])

  const dirty = useMemo(() => data !== null && JSON.stringify(data) !== saved, [data, saved])
  useUnsaved(dirty)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!data) return
    for (const f of cfg.groups.flatMap((g) => g.fields)) {
      const v = getPath(data, f.key)
      if (f.required && (v === '' || v === undefined || v === null)) return setError(`${f.label} is required.`)
    }
    setSaving(true)
    setError('')
    try {
      const clean = tidy(data)
      // Page copy is saved block by block: send only the blocks this form edits.
      const blocks = [...new Set(cfg.groups.flatMap((g) => g.fields.map((f) => f.key.split('.')[0])))]
      const body = cfg.source === 'page' ? Object.fromEntries(blocks.map((b) => [b, clean[b]])) : clean
      const fresh = await api<Data>(path, { method: 'PUT', admin: true, body: json(body) })
      setData(fresh)
      setSaved(JSON.stringify(fresh))
      toast('Saved. The website shows the change now.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const discard = () => {
    setData(JSON.parse(saved) as Data)
    setError('')
  }

  return (
    <form className="adm-panel" onSubmit={save} noValidate>
      <PanelHead
        title={cfg.title}
        actions={
          <>
            {cfg.preview !== undefined && (
              <a className="btn btn-ghost" href={`${import.meta.env.BASE_URL}?preview${cfg.preview}`} target="_blank" rel="noopener">
                See on website ↗
              </a>
            )}
            <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>
          </>
        }
      >
        {cfg.description}
      </PanelHead>

      {error && data && <p className="adm-error" role="alert">{error}</p>}
      {!data ? (
        <Loading error={error} retry={load} />
      ) : (
        cfg.groups.map((g) => (
          <fieldset className="adm-card" key={g.title}>
            <legend>{g.title}</legend>
            {g.note && <p className="adm-card-note">{g.note}</p>}
            <div className="adm-form-grid">
              {g.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={getPath(data, f.key)} onChange={(v) => setData((cur) => setPath(cur, f.key, v))} />
              ))}
            </div>
          </fieldset>
        ))
      )}

      {dirty && (
        <div className="adm-savebar" role="region" aria-label="Unsaved changes">
          <span>You have unsaved changes.</span>
          <button type="button" className="btn btn-ghost btn-small" onClick={discard} disabled={saving}>Discard</button>
          <button type="submit" className="btn btn-primary btn-small" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </form>
  )
}
