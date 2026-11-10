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

export type Content = {
  settings: SiteSettings
  programs: Program[]
  batches: Batch[]
  testimonials: Testimonial[]
}

export const STUDENT_CLASSES = ['Class 11', 'Class 12', '12th pass (dropper)', 'Class 10 (foundation)'] as const
export const TARGETS = ['JEE Main & Advanced', 'NEET', 'Boards only'] as const

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  open: 'Open',
  few: 'Few left',
  waitlist: 'Waitlist',
}
