import { useRef, useState, type ChangeEvent } from 'react'
import { api, json, saveBlob } from '../api'
import { PanelHead, plural, useToast, whenFull } from './ui'

type BackupFile = {
  kind?: string
  exported_at?: string
  settings?: unknown
  page?: unknown
  programs?: unknown[]
  batches?: unknown[]
  testimonials?: unknown[]
  enquiries?: unknown[]
}

const stamp = () => new Date().toISOString().slice(0, 10)
const asFile = (data: unknown) => new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })

export default function Backup() {
  const toast = useToast()
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<{ name: string; data: BackupFile } | null>(null)
  const [withEnquiries, setWithEnquiries] = useState(false)
  const [sure, setSure] = useState(false)

  async function run(name: string, action: () => Promise<void>) {
    setBusy(name)
    setError('')
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const downloadBackup = () =>
    run('backup', async () => {
      saveBlob(asFile(await api('/admin/backup', { admin: true })), `physics-bkumar-backup-${stamp()}.json`)
      toast('Backup downloaded.')
    })

  const downloadContent = () =>
    run('content', async () => {
      saveBlob(asFile(await api('/content')), 'content.json')
      toast('content.json downloaded.')
    })

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    setError('')
    setSure(false)
    setWithEnquiries(false)
    try {
      const data = JSON.parse(await picked.text()) as BackupFile
      if (!data || typeof data !== 'object' || data.kind !== 'physics-bkumar-backup') throw new Error('not a backup')
      setFile({ name: picked.name, data })
    } catch {
      setFile(null)
      setError('That file is not a backup made by this console. Choose a file from “Download backup”.')
    }
  }

  const restore = () =>
    run('restore', async () => {
      if (!file) return
      await api(`/admin/restore?include_enquiries=${withEnquiries}`, { method: 'POST', admin: true, body: json(file.data) })
      setFile(null)
      toast('Restored. The website shows the restored content now.')
    })

  const d = file?.data

  return (
    <section className="adm-panel narrow">
      <PanelHead title="Backup & restore">
        Keep a copy of everything on the website and every enquiry, and bring it back if something is deleted by mistake.
      </PanelHead>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="adm-card">
        <h2 className="card-title">Download a backup</h2>
        <p className="adm-card-note">
          One file with all site details, page text, programs, batches, reviews and enquiries. It contains students’ names and phone
          numbers, so keep it somewhere private. Uploaded photos are not included.
        </p>
        <div className="card-actions">
          <button type="button" className="btn btn-primary" onClick={downloadBackup} disabled={busy === 'backup'}>
            {busy === 'backup' ? 'Preparing…' : 'Download backup'}
          </button>
        </div>
      </div>

      <div className="adm-card">
        <h2 className="card-title">Restore from a backup</h2>
        <p className="adm-card-note">
          Replaces what is on the website with what is in the file. Take a fresh backup first if you may want the current version back.
        </p>
        <input ref={picker} type="file" accept="application/json,.json" hidden onChange={choose} />
        {!d ? (
          <div className="card-actions">
            <button type="button" className="btn btn-ghost" onClick={() => picker.current?.click()}>Choose backup file</button>
          </div>
        ) : (
          <>
            <dl className="facts-list">
              <div><dt>File</dt><dd>{file.name}</dd></div>
              {d.exported_at && <div><dt>Made on</dt><dd>{whenFull(d.exported_at)}</dd></div>}
              <div>
                <dt>Will replace</dt>
                <dd>
                  {[
                    d.settings ? 'site details' : '',
                    d.page ? 'page text' : '',
                    d.programs ? plural(d.programs.length, 'program') : '',
                    d.batches ? plural(d.batches.length, 'batch', 'batches') : '',
                    d.testimonials ? plural(d.testimonials.length, 'review') : '',
                  ].filter(Boolean).join(', ') || 'nothing'}
                </dd>
              </div>
            </dl>
            {d.enquiries && (
              <label className="check">
                <input type="checkbox" checked={withEnquiries} onChange={(e) => setWithEnquiries(e.target.checked)} />
                <span>Also replace all enquiries with the {plural(d.enquiries.length, 'enquiry', 'enquiries')} in this file</span>
                <small>Enquiries received after this backup was made will be lost. Leave off to keep the current enquiries.</small>
              </label>
            )}
            <label className="check">
              <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
              <span>I understand this replaces the current website content</span>
            </label>
            <div className="card-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setFile(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={restore} disabled={!sure || busy === 'restore'}>
                {busy === 'restore' ? 'Restoring…' : 'Restore this backup'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="adm-card">
        <h2 className="card-title">Update the GitHub Pages copy</h2>
        <p className="adm-card-note">
          The free copy of the site on GitHub Pages has no server, so it cannot read changes made here. To update it, download this
          file, replace <code>frontend/public/content.json</code> in the project with it, and push to GitHub.
        </p>
        <div className="card-actions">
          <button type="button" className="btn btn-ghost" onClick={downloadContent} disabled={busy === 'content'}>
            {busy === 'content' ? 'Preparing…' : 'Download content.json'}
          </button>
        </div>
      </div>
    </section>
  )
}
