import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { Loading, PanelHead, whenFull } from './ui'

type Entry = { id: number; at: string; actor: string; action: string; detail: string }

const KINDS: [prefix: string, label: string][] = [
  ['', 'Everything'],
  ['login', 'Sign-ins'],
  ['enquiry', 'Enquiries'],
  ['content', 'Website content'],
  ['account', 'Account'],
  ['backup', 'Backups'],
]
const CONTENT = ['page', 'settings', 'program', 'batch', 'review', 'media']
const kindOf = (action: string) => {
  const head = action.split('.')[0]
  return CONTENT.includes(head) ? 'content' : head
}

export default function Activity() {
  const [rows, setRows] = useState<Entry[] | null>(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState('')

  const load = useCallback(() => {
    setError('')
    api<Entry[]>('/admin/activity?limit=500', { admin: true })
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const shown = useMemo(() => rows?.filter((r) => !kind || kindOf(r.action) === kind) ?? [], [rows, kind])

  return (
    <section className="adm-panel">
      <PanelHead title="Activity log" actions={<button type="button" className="btn btn-ghost" onClick={load}>Refresh</button>}>
        Everything done in this console, newest first: sign-ins, failed sign-in attempts, edits and deletions. The latest 1,000 are kept.
      </PanelHead>

      <div className="adm-filters" role="group" aria-label="Filter by kind">
        {KINDS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={kind === value} className={kind === value ? 'on' : ''} onClick={() => setKind(value)}>{label}</button>
        ))}
      </div>

      {rows === null ? (
        <Loading error={error} retry={load} />
      ) : shown.length === 0 ? (
        <div className="adm-empty">Nothing of this kind yet.</div>
      ) : (
        <div className="adm-table" tabIndex={0} role="region" aria-label="Activity">
          <table>
            <thead>
              <tr><th scope="col">When</th><th scope="col">What happened</th><th scope="col">Who</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={r.action === 'login.failed' ? 'is-alert' : ''}>
                  <td className="mono">{whenFull(r.at)}</td>
                  <td className="wrap-cell">{r.detail || r.action}</td>
                  <td className="adm-muted">{r.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
