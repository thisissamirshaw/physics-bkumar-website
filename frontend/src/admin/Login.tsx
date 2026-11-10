import { useState, type FormEvent } from 'react'
import { api, auth, json } from '../api'

export default function Login({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get('password') ?? '')
    if (!password) return setError('Enter the admin password.')
    setBusy(true)
    setError('')
    try {
      const res = await api<{ token: string }>('/admin/login', { method: 'POST', body: json({ password }) })
      auth.set(res.token)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={submit}>
        <span className="brand-mark">BK</span>
        <h1>Sign in to admin</h1>
        <p>Manage enquiries, batches and site details.</p>
        <div className="field">
          <label htmlFor="a-pass">Password</label>
          <input id="a-pass" name="password" type="password" autoComplete="current-password" autoFocus />
        </div>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
