import { useState, type FormEvent } from 'react'
import { api, auth, json } from '../api'
import type { AccountInfo } from './Admin'

export default function Login({ onDone }: { onDone: (account: AccountInfo) => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    if (!email || !password) return setError('Enter your email and password.')
    setBusy(true)
    setError('')
    try {
      const res = await api<{ token: string; account: AccountInfo }>('/admin/login', { method: 'POST', body: json({ email, password }) })
      auth.set(res.token)
      onDone(res.account)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={submit} noValidate>
        <span className="brand-mark">BK</span>
        <div>
          <h1>Super admin</h1>
          <p>Sign in to manage the website, enquiries and settings.</p>
        </div>
        <div className="field">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required />
        </div>
        <div className="field">
          <label htmlFor="a-pass">Password</label>
          <div className="pass-row">
            <input id="a-pass" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required />
            <button type="button" className="link-btn" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a className="adm-back" href={import.meta.env.BASE_URL}>← Back to the website</a>
      </form>
    </div>
  )
}
