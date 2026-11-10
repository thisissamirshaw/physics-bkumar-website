import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AUTH_EXPIRED, api, auth } from '../api'
import Login from './Login'
import Enquiries from './Enquiries'
import CrudPanel from './CrudPanel'
import SettingsPanel from './SettingsPanel'
import { batchConfig, programConfig, testimonialConfig } from './configs'
import './admin.css'

type Phase = 'checking' | 'signed-out' | 'signed-in'

export default function Admin() {
  const [phase, setPhase] = useState<Phase>(auth.get() ? 'checking' : 'signed-out')

  useEffect(() => {
    document.title = 'Admin · Physics by B. Kumar'
    if (phase !== 'checking') return
    api('/admin/me', { admin: true })
      .then(() => setPhase('signed-in'))
      .catch(() => setPhase('signed-out'))
  }, [phase])

  // Any 401 from the API clears the token; go back to the sign-in screen.
  useEffect(() => {
    const onExpired = () => setPhase('signed-out')
    window.addEventListener(AUTH_EXPIRED, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED, onExpired)
  }, [])

  if (phase === 'checking') return <div className="adm-center">Checking your session…</div>
  if (phase === 'signed-out') return <Login onDone={() => setPhase('signed-in')} />

  const signOut = () => {
    auth.clear()
    setPhase('signed-out')
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="brand-mark">BK</span>
          <span>Admin</span>
        </div>
        <nav>
          <NavLink to="enquiries">Enquiries</NavLink>
          <NavLink to="batches">Batches</NavLink>
          <NavLink to="programs">Programs</NavLink>
          <NavLink to="testimonials">Reviews</NavLink>
          <NavLink to="settings">Site details</NavLink>
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noopener">View site ↗</a>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="adm-main">
        <Routes>
          <Route index element={<Navigate to="enquiries" replace />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="batches" element={<CrudPanel key="b" {...batchConfig} />} />
          <Route path="programs" element={<CrudPanel key="p" {...programConfig} />} />
          <Route path="testimonials" element={<CrudPanel key="t" {...testimonialConfig} />} />
          <Route path="settings" element={<SettingsPanel />} />
          <Route path="*" element={<Navigate to="enquiries" replace />} />
        </Routes>
      </main>
    </div>
  )
}
