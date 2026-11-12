import { createContext, useCallback, useContext, useEffect, useState, type MouseEvent } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AUTH_EXPIRED, api, auth } from '../api'
import type { EnquiryStatus } from '../types'
import Login from './Login'
import Dashboard from './Dashboard'
import Enquiries from './Enquiries'
import CrudPanel from './CrudPanel'
import DocPanel from './DocPanel'
import Account from './Account'
import Activity from './Activity'
import Backup from './Backup'
import { batchConfig, programConfig, testimonialConfig } from './configs'
import * as docs from './docs'
import { ToastProvider, okToLeave } from './ui'
import './admin.css'

export type AccountInfo = { email: string; starter_password: boolean; last_login_at: string | null }

type Session = {
  account: AccountInfo
  setAccount: (a: AccountInfo) => void
  /** Number of enquiries still marked New, for the badge in the menu. */
  newCount: number | null
  refreshCounts: () => void
}

const SessionContext = createContext<Session | null>(null)
export function useSession(): Session {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession outside the console')
  return s
}

const NAV: { group: string; items: [to: string, label: string][] }[] = [
  { group: '', items: [['dashboard', 'Dashboard'], ['enquiries', 'Enquiries']] },
  {
    group: 'Website content',
    items: [
      ['home', 'Home page top'], ['programs', 'Programs'], ['batches', 'Batches'], ['method', 'Method'],
      ['syllabus', 'Syllabus'], ['teacher', 'Teacher'], ['testimonials', 'Reviews'], ['facts', 'Facts strip'],
    ],
  },
  {
    group: 'Site settings',
    items: [
      ['contact', 'Contact details'], ['sections', 'Sections'], ['form', 'Enquiry form'],
      ['branding', 'Branding & SEO'], ['status', 'Site status'],
    ],
  },
  { group: 'System', items: [['account', 'Account & security'], ['activity', 'Activity log'], ['backup', 'Backup & restore']] },
]

type Phase = 'checking' | 'signed-out' | 'signed-in'

export default function Admin() {
  const [phase, setPhase] = useState<Phase>(auth.get() ? 'checking' : 'signed-out')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [newCount, setNewCount] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // The console is private: keep it out of search results.
  useEffect(() => {
    const robots = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' })
    document.head.append(robots)
    return () => robots.remove()
  }, [])

  useEffect(() => {
    const here = NAV.flatMap((g) => g.items).find(([to]) => location.pathname.endsWith(`/${to}`))
    document.title = `${phase === 'signed-in' && here ? `${here[1]} · ` : ''}Super admin · Physics by B. Kumar`
  }, [location.pathname, phase])

  useEffect(() => {
    if (phase !== 'checking') return
    api<AccountInfo>('/admin/me', { admin: true })
      .then((a) => {
        setAccount(a)
        setPhase('signed-in')
      })
      .catch(() => setPhase('signed-out'))
  }, [phase])

  // Any 401 from the API clears the token; go back to the sign-in screen.
  useEffect(() => {
    const onExpired = () => setPhase('signed-out')
    window.addEventListener(AUTH_EXPIRED, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED, onExpired)
  }, [])

  const refreshCounts = useCallback(() => {
    api<Record<EnquiryStatus, number>>('/admin/enquiries/summary', { admin: true })
      .then((c) => setNewCount(c.new))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (phase !== 'signed-in') return
    refreshCounts()
    const id = window.setInterval(refreshCounts, 60000)
    return () => window.clearInterval(id)
  }, [phase, refreshCounts])

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (phase === 'checking') return <div className="adm-center" role="status">Checking your session…</div>
  if (phase === 'signed-out' || !account)
    return (
      <Login
        onDone={(a) => {
          setAccount(a)
          setPhase('signed-in')
        }}
      />
    )

  const signOut = () => {
    if (!okToLeave()) return
    auth.clear()
    setAccount(null)
    setPhase('signed-out')
  }
  const guard = (e: MouseEvent) => {
    if (!okToLeave()) e.preventDefault()
  }

  return (
    <SessionContext.Provider value={{ account, setAccount, newCount, refreshCounts }}>
      <ToastProvider>
        <div className="adm">
          <aside className={`adm-side${menuOpen ? ' is-open' : ''}`}>
            <div className="adm-bar">
              <div className="adm-brand">
                <span className="brand-mark">BK</span>
                <span>Super admin</span>
              </div>
              <button type="button" className="adm-menu-btn" aria-expanded={menuOpen} aria-controls="adm-nav" onClick={() => setMenuOpen((o) => !o)}>
                {menuOpen ? 'Close' : 'Menu'}
              </button>
            </div>
            <div className="adm-nav-wrap" id="adm-nav">
              <nav aria-label="Console">
                {NAV.map((g) => (
                  <div className="adm-nav-group" key={g.group || 'top'}>
                    {g.group && <span className="adm-nav-label">{g.group}</span>}
                    {g.items.map(([to, label]) => (
                      <NavLink key={to} to={`/admin/${to}`} onClick={guard}>
                        {label}
                        {to === 'enquiries' && newCount ? <span className="badge" aria-label={`${newCount} new`}>{newCount}</span> : null}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>
              <div className="adm-side-foot">
                <span className="adm-who" title={account.email}>{account.email}</span>
                <a href={`${import.meta.env.BASE_URL}?preview`} target="_blank" rel="noopener">View website ↗</a>
                <button type="button" onClick={signOut}>Sign out</button>
              </div>
            </div>
          </aside>
          <main className="adm-main">
            {account.starter_password && !location.pathname.endsWith('/account') && (
              <p className="adm-warn" role="alert">
                You are still using the starter password, which anyone can read in the project’s public code.{' '}
                <NavLink to="/admin/account" onClick={guard}>Change it now</NavLink>
              </p>
            )}
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="enquiries" element={<Enquiries />} />
              <Route path="home" element={<DocPanel key="home" {...docs.home} />} />
              <Route path="programs" element={<CrudPanel key="p" {...programConfig} />} />
              <Route path="batches" element={<CrudPanel key="b" {...batchConfig} />} />
              <Route path="method" element={<DocPanel key="method" {...docs.method} />} />
              <Route path="syllabus" element={<DocPanel key="syllabus" {...docs.syllabus} />} />
              <Route path="teacher" element={<DocPanel key="teacher" {...docs.teacher} />} />
              <Route path="testimonials" element={<CrudPanel key="t" {...testimonialConfig} />} />
              <Route path="facts" element={<DocPanel key="facts" {...docs.facts} />} />
              <Route path="contact" element={<DocPanel key="contact" {...docs.contact} />} />
              <Route path="sections" element={<DocPanel key="sections" {...docs.sections} />} />
              <Route path="form" element={<DocPanel key="form" {...docs.form} />} />
              <Route path="branding" element={<DocPanel key="branding" {...docs.branding} />} />
              <Route path="status" element={<DocPanel key="status" {...docs.status} />} />
              <Route path="account" element={<Account />} />
              <Route path="activity" element={<Activity />} />
              <Route path="backup" element={<Backup />} />
              <Route path="settings" element={<Navigate to="../contact" replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </SessionContext.Provider>
  )
}
