import { useCallback, useEffect, useState } from 'react'
import { embeddedContent, loadContent } from './api'
import type { Content, SectionKey } from './types'
import { DEFAULT_PAGE } from './types'
import Announcement from './components/Announcement'
import Header from './components/Header'
import Hero from './components/Hero'
import Facts from './components/Facts'
import Programs from './components/Programs'
import Method from './components/Method'
import Syllabus from './components/Syllabus'
import Mentor from './components/Mentor'
import Results from './components/Results'
import Batches from './components/Batches'
import Visit from './components/Visit'
import Footer from './components/Footer'
import WhatsAppButton from './components/WhatsAppButton'
import Maintenance from './components/Maintenance'

const ORDER: SectionKey[] = ['facts', 'programs', 'method', 'syllabus', 'mentor', 'results', 'batches', 'visit']

// The console links here with ?preview to look at the site while it is closed to visitors.
const PREVIEW = new URLSearchParams(window.location.search).has('preview')

function setMeta(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute('content', content)
}

export default function Home() {
  const [content, setContent] = useState<Content | null>(embeddedContent)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [interest, setInterest] = useState<{ batch: string; n: number } | null>(null)

  useEffect(() => {
    if (content && attempt === 0) return // the server already put the content in the page
    let alive = true
    setError(null)
    loadContent()
      .then((c) => alive && setContent(c))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const s = content?.settings
  const page = content?.page ?? DEFAULT_PAGE
  const loading = !content && !error

  useEffect(() => {
    if (!content) return
    document.title = page.seo.title
    setMeta('meta[name="description"]', page.seo.description)
    setMeta('meta[property="og:title"]', s?.centre_name ?? page.seo.title)
    setMeta('meta[property="og:description"]', page.seo.description)
    document.documentElement.dataset.accent = page.branding.accent
    return () => {
      delete document.documentElement.dataset.accent
    }
  }, [content, page, s])

  const pickBatch = useCallback((batch: string) => setInterest((cur) => ({ batch, n: (cur?.n ?? 0) + 1 })), [])

  if (page.status.maintenance && !PREVIEW) return <Maintenance page={page} settings={s} />

  const shown = ORDER.filter((key) => {
    if (!page.sections[key].show) return false
    if (key === 'mentor') return Boolean(s)
    if (key === 'results') return Boolean(content && content.testimonials.length > 0)
    if (key === 'facts') return !s || s.facts.length > 0
    return true
  })
  // A section sits flush against the one above unless that one ends in a rule or a dark band.
  const flush = (key: SectionKey) => {
    const prev = shown[shown.indexOf(key) - 1]
    return prev !== 'facts' && prev !== 'method'
  }
  const has = (key: SectionKey) => shown.includes(key)
  const canBook = has('visit') && page.form.enabled

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {PREVIEW && page.status.maintenance && (
        <p className="preview-note" role="status">Preview. Visitors see the “{page.status.maintenance_title}” page right now.</p>
      )}
      <Announcement a={page.announcement} />
      <Header name={s?.centre_name} branding={page.branding} shown={shown} />
      <main id="main">
        <Hero hero={page.hero} loading={loading} primaryHref={has('visit') ? '#visit' : '#programs'} showSecondary={has('programs')} />
        {has('facts') && <Facts facts={s?.facts} />}
        {error && (
          <div className="wrap">
            <p className="load-error" role="alert">
              Some details could not load. {error}{' '}
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
            </p>
          </div>
        )}
        {has('programs') && <Programs programs={content?.programs} head={page.sections.programs} flush={flush('programs')} linkTo={has('batches') ? '#batches' : has('visit') ? '#visit' : null} />}
        {has('method') && <Method head={page.sections.method} steps={page.method.steps} />}
        {has('syllabus') && <Syllabus head={page.sections.syllabus} units={page.syllabus.units} flush={flush('syllabus')} />}
        {has('mentor') && s && <Mentor settings={s} head={page.sections.mentor} flush={flush('mentor')} />}
        {has('results') && content && <Results testimonials={content.testimonials} head={page.sections.results} flush={flush('results')} />}
        {has('batches') && <Batches batches={content?.batches} session={s?.batch_session} head={page.sections.batches} flush={flush('batches')} onPick={canBook ? pickBatch : undefined} />}
        {has('visit') && <Visit settings={s} head={page.sections.visit} form={page.form} flush={flush('visit')} interest={interest} />}
      </main>
      <Footer settings={s} branding={page.branding} />
      {s?.whatsapp && <WhatsAppButton number={s.whatsapp} message={page.form.whatsapp_message} />}
    </>
  )
}
