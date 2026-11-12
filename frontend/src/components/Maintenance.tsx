import { useEffect } from 'react'
import type { PageContent, SiteSettings } from '../types'

/** Shown instead of the site while "Close the site for maintenance" is on in the console. */
export default function Maintenance({ page, settings: s }: { page: PageContent; settings?: SiteSettings }) {
  useEffect(() => {
    document.title = `${page.status.maintenance_title} · ${s?.centre_name ?? 'Physics by B. Kumar'}`
  }, [page, s])

  const tel = s?.phone.replace(/[^\d+]/g, '')
  return (
    <main className="closed">
      <span className="brand-mark">{page.branding.brand_mark}</span>
      <h1>{page.status.maintenance_title}</h1>
      <p>{page.status.maintenance_message}</p>
      <div className="closed-links">
        {tel && !/^\+?9?1?0+$/.test(tel) && <a className="btn btn-primary" href={`tel:${tel}`}>Call {s?.phone}</a>}
        {s?.whatsapp && (
          <a className="btn btn-ghost" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
        )}
      </div>
    </main>
  )
}
