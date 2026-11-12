import { useState, type FormEvent } from 'react'
import { api, auth, json } from '../api'
import { useSession, type AccountInfo } from './Admin'
import { PanelHead, useToast, whenFull } from './ui'

type TokenOut = { token: string; account: AccountInfo }

export default function Account() {
  const toast = useToast()
  const { account, setAccount } = useSession()
  const [emailError, setEmailError] = useState('')
  const [passError, setPassError] = useState('')
  const [busy, setBusy] = useState('')
  const [show, setShow] = useState(false)

  async function changeEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (!data.email.trim() || !data.current_password) return setEmailError('Enter the new email and your current password.')
    setBusy('email')
    setEmailError('')
    try {
      setAccount(await api<AccountInfo>('/admin/account/email', { method: 'PUT', admin: true, body: json(data) }))
      form.reset()
      toast('Sign-in email changed.')
    } catch (err) {
      setEmailError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    if (!data.current_password) return setPassError('Enter your current password.')
    if (data.new_password.length < 8) return setPassError('The new password needs at least 8 characters.')
    if (data.new_password !== data.confirm) return setPassError('The two new passwords do not match.')
    setBusy('password')
    setPassError('')
    try {
      const res = await api<TokenOut>('/admin/account/password', {
        method: 'PUT', admin: true, body: json({ current_password: data.current_password, new_password: data.new_password }),
      })
      auth.set(res.token)
      setAccount(res.account)
      form.reset()
      toast('Password changed. Other devices have been signed out.')
    } catch (err) {
      setPassError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  async function signOutOthers() {
    setBusy('sessions')
    try {
      const res = await api<TokenOut>('/admin/account/signout-all', { method: 'POST', admin: true })
      auth.set(res.token)
      toast('Every other device has been signed out.')
    } catch (err) {
      setPassError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <section className="adm-panel narrow">
      <PanelHead title="Account & security">
        The email and password for this console. There is one super admin account; visitors to the website never sign in.
      </PanelHead>

      {account.starter_password && (
        <p className="adm-warn" role="alert">
          This account still has the starter password. It is written in the project’s public code, so anyone could sign in. Set your own below.
        </p>
      )}

      <form className="adm-card" onSubmit={changePassword} noValidate>
        <h2 className="card-title">Change password</h2>
        <div className="adm-form-grid one">
          <div className="field">
            <label htmlFor="ac-cur">Current password</label>
            <input id="ac-cur" name="current_password" type={type} autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="ac-new">New password</label>
            <input id="ac-new" name="new_password" type={type} autoComplete="new-password" aria-describedby="ac-new-hint" />
            <small className="hint" id="ac-new-hint">At least 8 characters. A few unrelated words is strong and easy to remember.</small>
          </div>
          <div className="field">
            <label htmlFor="ac-conf">New password again</label>
            <input id="ac-conf" name="confirm" type={type} autoComplete="new-password" />
          </div>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>
        </div>
        {passError && <p className="adm-error" role="alert">{passError}</p>}
        <div className="card-actions">
          <button className="btn btn-primary" type="submit" disabled={busy === 'password'}>{busy === 'password' ? 'Saving…' : 'Change password'}</button>
        </div>
      </form>

      <form className="adm-card" onSubmit={changeEmail} noValidate>
        <h2 className="card-title">Sign-in email</h2>
        <p className="adm-card-note">Now: <strong>{account.email}</strong></p>
        <div className="adm-form-grid one">
          <div className="field">
            <label htmlFor="ac-email">New email</label>
            <input id="ac-email" name="email" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="field">
            <label htmlFor="ac-epass">Current password, to confirm</label>
            <input id="ac-epass" name="current_password" type="password" autoComplete="current-password" />
          </div>
        </div>
        {emailError && <p className="adm-error" role="alert">{emailError}</p>}
        <div className="card-actions">
          <button className="btn btn-primary" type="submit" disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : 'Change email'}</button>
        </div>
      </form>

      <div className="adm-card">
        <h2 className="card-title">Sessions</h2>
        <p className="adm-card-note">
          {account.last_login_at ? `Sign-in before this one: ${whenFull(account.last_login_at)}. ` : ''}
          A sign-in lasts 12 hours. If you used a shared computer, sign out everywhere else. This device stays signed in.
        </p>
        <div className="card-actions">
          <button className="btn btn-ghost" type="button" onClick={signOutOthers} disabled={busy === 'sessions'}>
            {busy === 'sessions' ? 'Signing out…' : 'Sign out other devices'}
          </button>
        </div>
      </div>
    </section>
  )
}
