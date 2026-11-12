import { useState } from 'react'
import { safeHref } from '../api'
import type { PageContent } from '../types'

const KEY = 'pbk_notice_closed'

/** Optional strip above the header, e.g. "Admissions open for 2027". Closing it lasts for the visit. */
export default function Announcement({ a }: { a: PageContent['announcement'] }) {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === a.text
    } catch {
      return false
    }
  })
  if (!a.enabled || !a.text.trim() || closed) return null

  const close = () => {
    setClosed(true)
    try {
      sessionStorage.setItem(KEY, a.text)
    } catch {
      /* storage blocked: it stays closed until the next page load */
    }
  }
  const href = safeHref(a.link_url)
  const external = /^https?:/i.test(href ?? '')

  return (
    <div className="notice" role="region" aria-label="Announcement">
      <div className="wrap notice-row">
        <p>
          {a.text}
          {href && a.link_label && (
            <>
              {' '}
              <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {a.link_label} <span aria-hidden="true">→</span>
              </a>
            </>
          )}
        </p>
        <button type="button" onClick={close} aria-label="Close announcement">×</button>
      </div>
    </div>
  )
}
