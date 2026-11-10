import { useEffect, useState } from 'react'
import { loadContent } from './api'
import type { Content } from './types'
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

export default function Home() {
  const [content, setContent] = useState<Content | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadContent<Content>()
      .then((c) => alive && setContent(c))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  const s = content?.settings

  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Facts facts={s?.facts} />
        {error && (
          <div className="wrap">
            <p className="load-error" role="alert">Some details could not load. {error}</p>
          </div>
        )}
        <Programs programs={content?.programs} />
        <Method />
        <Syllabus />
        {s && <Mentor settings={s} />}
        {content && content.testimonials.length > 0 && <Results testimonials={content.testimonials} />}
        <Batches batches={content?.batches} session={s?.batch_session} />
        <Visit settings={s} />
      </main>
      <Footer name={s?.centre_name} />
      {s?.whatsapp && <WhatsAppButton number={s.whatsapp} />}
    </>
  )
}
