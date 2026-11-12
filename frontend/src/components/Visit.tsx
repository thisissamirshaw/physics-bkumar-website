import { useEffect, useRef, useState, type FormEvent } from 'react'
import { STATIC_SITE, api, json, safeHref } from '../api'
import type { PageContent, SectionHead as Head, SiteSettings } from '../types'
import { blockClass } from './SectionHead'

type FormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string; field?: 'name' | 'phone' }

type Props = {
  settings?: SiteSettings
  head: Head
  form: PageContent['form']
  flush: boolean
  /** Set when a visitor presses "Book demo" on a batch row. `n` changes on every press. */
  interest: { batch: string; n: number } | null
}

const INTEREST = /^Interested in: .*$/m

/** Same rule as the server: an Indian mobile, with or without +91 or a leading 0. */
function mobileDigits(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}

export default function Visit({ settings: s, head, form: f, flush, interest }: Props) {
  const [state, setState] = useState<FormState>({ kind: 'idle' })
  const nameRef = useRef<HTMLInputElement>(null)
  const msgRef = useRef<HTMLTextAreaElement>(null)

  // "Book demo" on a batch: note the batch in the message and put the cursor in the form.
  useEffect(() => {
    if (!interest) return
    setState((cur) => (cur.kind === 'done' ? { kind: 'idle' } : cur))
    const id = window.setTimeout(() => {
      const box = msgRef.current
      if (box) {
        const line = `Interested in: ${interest.batch}`
        box.value = INTEREST.test(box.value) ? box.value.replace(INTEREST, line) : [line, box.value].filter(Boolean).join('\n')
      }
      nameRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(id)
  }, [interest])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>

    if (data.name.trim().length < 2) {
      nameRef.current?.focus()
      return setState({ kind: 'error', field: 'name', message: 'Enter the student’s name.' })
    }
    const phone = mobileDigits(data.phone)
    if (!phone) {
      form.querySelector<HTMLInputElement>('#f-phone')?.focus()
      return setState({ kind: 'error', field: 'phone', message: 'Enter a 10-digit mobile number, like 98765 43210.' })
    }

    if (STATIC_SITE) {
      const text = [
        `Demo class request: ${data.name.trim()}`,
        `Mobile: ${phone}`,
        `Class: ${data.student_class} · Target: ${data.target}`,
        data.message?.trim() ? `Note: ${data.message.trim()}` : '',
      ].filter(Boolean).join('\n')
      const wa = s?.whatsapp.replace(/\D/g, '')
      if (wa) {
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
        return setState({ kind: 'done', message: 'WhatsApp has opened with your request. Press send there and we’ll reply soon.' })
      }
      if (s?.email) {
        window.location.href = `mailto:${s.email}?subject=${encodeURIComponent('Demo class request')}&body=${encodeURIComponent(text)}`
        return setState({ kind: 'done', message: 'Your email app has opened with your request. Press send there and we’ll call you back.' })
      }
      return setState({ kind: 'done', message: `Please call us on ${s?.phone ?? 'the number above'} to book your demo class.` })
    }

    setState({ kind: 'sending' })
    try {
      const res = await api<{ message: string }>('/enquiries', { method: 'POST', body: json({ ...data, phone }) })
      setState({ kind: 'done', message: res.message })
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message })
    }
  }

  const tel = s?.phone.replace(/[^\d+]/g, '')
  const bad = state.kind === 'error' ? state.field : undefined
  const clearError = () => setState((cur) => (cur.kind === 'error' ? { kind: 'idle' } : cur))

  return (
    <section className={blockClass(flush)} id="visit">
      <div className="wrap visit">
        <div className="visit-info">
          {head.eyebrow && <span className="eyebrow">{head.eyebrow}</span>}
          {head.title && <h2>{head.title}</h2>}
          {head.intro && <p>{head.intro}</p>}
          <dl>
            <div>
              <dt>Address</dt>
              <dd>{s?.address ?? '…'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{s ? <a href={`tel:${tel}`}>{s.phone}</a> : '…'}</dd>
            </div>
            {s?.email && (
              <div>
                <dt>Email</dt>
                <dd><a href={`mailto:${s.email}`}>{s.email}</a></dd>
              </div>
            )}
            <div>
              <dt>Hours</dt>
              <dd>{s?.hours ?? '…'}</dd>
            </div>
          </dl>
          {s && safeHref(s.maps_url) && (
            <a className="btn" href={safeHref(s.maps_url)} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <span className="arrow">↗</span>
            </a>
          )}
        </div>

        {!f.enabled ? (
          <div className="enquiry">
            <h3>{f.title}</h3>
            <p className="form-closed">{f.closed_text}</p>
            <div className="closed-links">
              {s && <a className="btn btn-primary" href={`tel:${tel}`}>Call {s.phone}</a>}
              {s?.whatsapp && (
                <a className="btn btn-ghost" href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(f.whatsapp_message)}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp us
                </a>
              )}
            </div>
          </div>
        ) : (
          <form className="enquiry" onSubmit={onSubmit} noValidate>
            <h3>{f.title}</h3>
            {state.kind === 'done' ? (
              <div className="form-done" role="status">
                <p>{state.message}</p>
                <button type="button" className="btn btn-ghost" onClick={() => setState({ kind: 'idle' })}>
                  Send another request
                </button>
              </div>
            ) : (
              <>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="f-name">Student name</label>
                    <input
                      id="f-name" name="name" ref={nameRef} autoComplete="name" placeholder="Aarav Sharma" maxLength={80} required
                      aria-invalid={bad === 'name' || undefined} aria-describedby={bad === 'name' ? 'f-status' : undefined}
                      onInput={bad === 'name' ? clearError : undefined}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="f-phone">Mobile number</label>
                    <input
                      id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" maxLength={16} required
                      aria-invalid={bad === 'phone' || undefined} aria-describedby={bad === 'phone' ? 'f-status' : undefined}
                      onInput={bad === 'phone' ? clearError : undefined}
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="f-class">Class</label>
                    <select id="f-class" name="student_class" defaultValue={f.classes[0]}>
                      {f.classes.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-target">Target</label>
                    <select id="f-target" name="target" defaultValue={f.targets[0]}>
                      {f.targets.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="f-msg">Anything we should know? <span className="optional">Optional</span></label>
                  <textarea id="f-msg" name="message" ref={msgRef} rows={2} maxLength={500} placeholder={f.message_placeholder} />
                </div>
                {/* Honeypot: hidden from people, bots tend to fill it. */}
                <div className="hp" aria-hidden="true">
                  <label htmlFor="f-website">Website</label>
                  <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={state.kind === 'sending'}>
                  {state.kind === 'sending' ? 'Sending…' : <>{f.button_label} <span className="arrow">→</span></>}
                </button>
                <p id="f-status" className={`form-msg${state.kind === 'error' ? ' is-error' : ''}`} aria-live="polite">
                  {state.kind === 'error' ? state.message : f.note}
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
