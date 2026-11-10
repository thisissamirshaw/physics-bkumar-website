import { useState, type FormEvent } from 'react'
import { STATIC_SITE, api, json } from '../api'
import { STUDENT_CLASSES, TARGETS, type SiteSettings } from '../types'

type FormState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; message: string } | { kind: 'error'; message: string }

export default function Visit({ settings: s }: { settings?: SiteSettings }) {
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>

    if (data.name.trim().length < 2) return setState({ kind: 'error', message: 'Enter the student’s name.' })
    if (data.phone.replace(/\D/g, '').length < 10)
      return setState({ kind: 'error', message: 'Enter a 10-digit mobile number.' })

    if (STATIC_SITE) {
      const text = [
        `Demo class request: ${data.name.trim()}`,
        `Mobile: ${data.phone.trim()}`,
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
      const res = await api<{ message: string }>('/enquiries', { method: 'POST', body: json(data) })
      setState({ kind: 'done', message: res.message })
      form.reset()
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message })
    }
  }

  const tel = s?.phone.replace(/[^\d+]/g, '')

  return (
    <section className="block flush-top" id="visit">
      <div className="wrap visit">
        <div className="visit-info">
          <span className="eyebrow">Visit the centre</span>
          <h2>Sit in on a class before you decide.</h2>
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
          {s?.maps_url && (
            <a className="btn" href={s.maps_url} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <span className="arrow">↗</span>
            </a>
          )}
        </div>

        <form className="enquiry" onSubmit={onSubmit} noValidate>
          <h3>Book a free demo class</h3>
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
                  <input id="f-name" name="name" autoComplete="name" placeholder="Aarav Sharma" maxLength={80} required />
                </div>
                <div className="field">
                  <label htmlFor="f-phone">Mobile number</label>
                  <input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98xxxxxxxx" maxLength={16} required />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="f-class">Class</label>
                  <select id="f-class" name="student_class" defaultValue={STUDENT_CLASSES[0]}>
                    {STUDENT_CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-target">Target</label>
                  <select id="f-target" name="target" defaultValue={TARGETS[0]}>
                    {TARGETS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-msg">Anything we should know? <span className="optional">Optional</span></label>
                <textarea id="f-msg" name="message" rows={2} maxLength={500} placeholder="School, preferred timing, weak chapters…" />
              </div>
              {/* Honeypot: hidden from people, bots tend to fill it. */}
              <div className="hp" aria-hidden="true">
                <label htmlFor="f-website">Website</label>
                <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <button className="btn btn-primary" type="submit" disabled={state.kind === 'sending'}>
                {state.kind === 'sending' ? 'Sending…' : <>Request a call back <span className="arrow">→</span></>}
              </button>
              <p className={`form-msg${state.kind === 'error' ? ' is-error' : ''}`} aria-live="polite">
                {state.kind === 'error' ? state.message : 'We’ll call to fix a demo class time that suits you.'}
              </p>
            </>
          )}
        </form>
      </div>
    </section>
  )
}
