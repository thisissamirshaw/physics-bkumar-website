import { useEffect, useState, type FormEvent } from 'react'
import { api, json } from '../api'
import type { Fact, SiteSettings } from '../types'
import { FieldInput, type Field } from './CrudPanel'

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Centre',
    fields: [
      { key: 'centre_name', label: 'Centre name', type: 'text', required: true },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'address', label: 'Address', type: 'text', wide: true },
      { key: 'phone', label: 'Phone (as shown)', type: 'text', hint: 'e.g. +91 98100 12345' },
      { key: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'Digits with country code, e.g. 919810012345. Leave empty to hide the button.' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'hours', label: 'Hours', type: 'text' },
      { key: 'maps_url', label: 'Google Maps link', type: 'text', wide: true },
      { key: 'batch_session', label: 'Batch session label', type: 'text', hint: 'e.g. 2027 session' },
    ],
  },
  {
    title: 'Teacher',
    fields: [
      { key: 'mentor_name', label: 'Name', type: 'text' },
      { key: 'mentor_photo_url', label: 'Photo URL', type: 'text', hint: 'Put a photo in frontend/public (e.g. /bkumar.jpg) or paste an image link.' },
      { key: 'mentor_quote', label: 'Quote', type: 'text', wide: true },
      { key: 'mentor_bio', label: 'Bio', type: 'textarea' },
    ],
  },
]

export default function SettingsPanel() {
  const [s, setS] = useState<SiteSettings | null>(null)
  const [creds, setCreds] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api<SiteSettings>('/admin/settings', { admin: true })
      .then((data) => {
        setS(data)
        setCreds(data.mentor_credentials.join('\n'))
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  if (!s) return <section className="adm-panel">{error ? <p className="adm-error">{error}</p> : <p className="adm-muted">Loading…</p>}</section>

  const set = (key: string, v: unknown) => setS((cur) => (cur ? { ...cur, [key]: v } : cur))
  const facts: Fact[] = [...s.facts, ...Array.from({ length: Math.max(0, 4 - s.facts.length) }, () => ({ value: '', label: '' }))]
  const setFact = (i: number, key: keyof Fact, v: string) => set('facts', facts.map((f, j) => (j === i ? { ...f, [key]: v } : f)))

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!s) return
    setSaving(true)
    setError('')
    try {
      const body = {
        ...s,
        mentor_credentials: creds.split('\n').map((c) => c.trim()).filter(Boolean),
        facts: facts.filter((f) => f.value.trim() && f.label.trim()),
      }
      const saved = await api<SiteSettings>('/admin/settings', { method: 'PUT', admin: true, body: json(body) })
      setS(saved)
      setFlash('Saved. The website shows the new details now.')
      window.setTimeout(() => setFlash(''), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="adm-panel" onSubmit={save}>
      <header className="adm-head">
        <div>
          <h1>Site details</h1>
          <p>Contact details, teacher profile and the four facts under the headline.</p>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </header>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {flash && <p className="adm-flash" role="status">{flash}</p>}

      {GROUPS.map((g) => (
        <fieldset className="adm-card" key={g.title}>
          <legend>{g.title}</legend>
          <div className="adm-form-grid">
            {g.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={(s as unknown as Record<string, unknown>)[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
            {g.title === 'Teacher' && (
              <div className="field wide">
                <label htmlFor="fld-creds">Credentials, one per line</label>
                <textarea id="fld-creds" rows={3} value={creds} onChange={(e) => setCreds(e.target.value)} />
              </div>
            )}
          </div>
        </fieldset>
      ))}

      <fieldset className="adm-card">
        <legend>Facts strip</legend>
        <div className="facts-edit">
          {facts.slice(0, 4).map((f, i) => (
            <div className="fact-edit" key={i}>
              <div className="field">
                <label htmlFor={`fact-v-${i}`}>Value {i + 1}</label>
                <input id={`fact-v-${i}`} value={f.value} maxLength={20} onChange={(e) => setFact(i, 'value', e.target.value)} placeholder="25" />
              </div>
              <div className="field">
                <label htmlFor={`fact-l-${i}`}>Label {i + 1}</label>
                <input id={`fact-l-${i}`} value={f.label} maxLength={60} onChange={(e) => setFact(i, 'label', e.target.value)} placeholder="Students per batch, max" />
              </div>
            </div>
          ))}
        </div>
        <small className="hint">Leave a row empty to drop it.</small>
      </fieldset>
    </form>
  )
}
