import defaults from './pageDefaults.json'

export type Fact = { value: string; label: string }

export type SiteSettings = {
  centre_name: string
  tagline: string
  address: string
  phone: string
  whatsapp: string
  email: string
  hours: string
  maps_url: string
  batch_session: string
  mentor_name: string
  mentor_quote: string
  mentor_bio: string
  mentor_photo_url: string
  mentor_credentials: string[]
  facts: Fact[]
}

export type Program = {
  id: number
  code: string
  title: string
  duration: string
  summary: string
  focus: string
  classes: string
  tests: string
  sort_order: number
}

export type BatchStatus = 'open' | 'few' | 'waitlist'

export type Batch = {
  id: number
  name: string
  track: string
  days: string
  time: string
  starts_on: string // YYYY-MM-DD
  status: BatchStatus
  active: boolean
  sort_order: number
}

export type Testimonial = {
  id: number
  student_name: string
  year: string
  score: string
  score_label: string
  quote: string
  published: boolean
  sort_order: number
}

export type EnquiryStatus = 'new' | 'contacted' | 'enrolled' | 'closed'

export type Enquiry = {
  id: number
  name: string
  phone: string
  student_class: string
  target: string
  message: string
  status: EnquiryStatus
  notes: string
  created_at: string
  updated_at: string
}

// ---------- Page copy edited in the console (mirrors backend/app/page.py) ----------

export type SectionKey = 'facts' | 'programs' | 'method' | 'syllabus' | 'mentor' | 'results' | 'batches' | 'visit'
export type SectionHead = { show: boolean; eyebrow: string; title: string; intro: string }
export type Accent = 'blue' | 'teal' | 'violet' | 'crimson' | 'amber'

export type PageContent = {
  hero: {
    eyebrow: string
    title: string
    title_accent: string
    lede: string
    cta_primary: string
    cta_secondary: string
    tracks: string[]
    show_simulation: boolean
  }
  announcement: { enabled: boolean; text: string; link_label: string; link_url: string }
  sections: Record<SectionKey, SectionHead>
  method: { steps: { title: string; text: string }[] }
  syllabus: { units: { name: string; grade: string; chapters: string[] }[] }
  form: {
    enabled: boolean
    title: string
    button_label: string
    note: string
    message_placeholder: string
    closed_text: string
    classes: string[]
    targets: string[]
    whatsapp_message: string
  }
  branding: {
    brand_mark: string
    brand_sub: string
    header_cta: string
    accent: Accent
    footer_note: string
    footer_equation: string
  }
  seo: { title: string; description: string }
  status: { maintenance: boolean; maintenance_title: string; maintenance_message: string }
}

export const DEFAULT_PAGE = defaults as PageContent

/** Fill in anything a saved page is missing (an older content.json, a newer field). */
export function withPageDefaults(page?: Partial<PageContent> | null): PageContent {
  const out = { ...DEFAULT_PAGE } as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_PAGE) as (keyof PageContent)[]) {
    out[key] = { ...DEFAULT_PAGE[key], ...(page?.[key] ?? {}) }
  }
  const sections = { ...DEFAULT_PAGE.sections }
  for (const key of Object.keys(sections) as SectionKey[]) {
    sections[key] = { ...DEFAULT_PAGE.sections[key], ...(page?.sections?.[key] ?? {}) }
  }
  out.sections = sections
  return out as PageContent
}

export type Content = {
  settings: SiteSettings
  programs: Program[]
  batches: Batch[]
  testimonials: Testimonial[]
  page: PageContent
}

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  open: 'Open',
  few: 'Few left',
  waitlist: 'Waitlist',
}
