import type { PageContent, SiteSettings } from '../types'

export default function Footer({ settings: s, branding }: { settings?: SiteSettings; branding: PageContent['branding'] }) {
  const tel = s?.phone.replace(/[^\d+]/g, '')
  const realPhone = tel && !/^\+?9?1?0+$/.test(tel) // skip the 00000 00000 placeholder
  return (
    <footer className="site">
      <div className="wrap foot">
        <span>
          © {new Date().getFullYear()} {s?.centre_name ?? 'Physics by B. Kumar'}
          {branding.footer_note && ` · ${branding.footer_note}`}
        </span>
        {(realPhone || s?.email) && (
          <span className="foot-links">
            {realPhone && <a href={`tel:${tel}`}>{s?.phone}</a>}
            {s?.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
          </span>
        )}
        {branding.footer_equation && <span className="eq">{branding.footer_equation}</span>}
      </div>
    </footer>
  )
}
