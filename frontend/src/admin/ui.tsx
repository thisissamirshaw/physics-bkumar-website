import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// ---------- Toasts: a short confirmation at the bottom of the screen ----------

const ToastContext = createContext<(message: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef(0)
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current)
    setMessage(text)
    timer.current = window.setTimeout(() => setMessage(''), 3200)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="adm-toast" role="status" aria-live="polite">
        {message && <span>{message}</span>}
      </div>
    </ToastContext.Provider>
  )
}

// ---------- Unsaved changes: warn before leaving a form that was edited ----------

const unsaved = { dirty: false }

export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    unsaved.dirty = dirty
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => {
      unsaved.dirty = false
      window.removeEventListener('beforeunload', warn)
    }
  }, [dirty])
}

/** True if it is fine to leave the current page (nothing edited, or the admin chose to discard). */
export function okToLeave(): boolean {
  if (!unsaved.dirty) return true
  const leave = window.confirm('You have changes that are not saved. Leave without saving?')
  if (leave) unsaved.dirty = false
  return leave
}

// ---------- Small pieces ----------

export function PanelHead({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="adm-head">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="adm-head-actions">{actions}</div>}
    </header>
  )
}

export function Loading({ error, retry }: { error?: string; retry?: () => void }) {
  if (error)
    return (
      <p className="adm-error" role="alert">
        {error} {retry && <button type="button" className="inline-btn" onClick={retry}>Try again</button>}
      </p>
    )
  return <p className="adm-muted" role="status">Loading…</p>
}

/** Two-step delete: the first press asks, the second does it. */
export function ConfirmButton({ label = 'Delete', confirm = 'Delete', onConfirm }: { label?: string; confirm?: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) return <button type="button" className="link-btn" onClick={() => setAsking(true)}>{label}</button>
  return (
    <span className="confirm">
      <button type="button" className="danger" autoFocus onClick={() => { setAsking(false); onConfirm() }}>{confirm}</button>
      <button type="button" onClick={() => setAsking(false)}>Keep</button>
    </span>
  )
}

const IST: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' }

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const whenFull = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
