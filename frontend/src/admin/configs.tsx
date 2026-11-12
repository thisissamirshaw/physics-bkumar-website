import { formatDate } from '../components/Batches'
import { BATCH_STATUS_LABEL, type Batch, type Program, type Testimonial } from '../types'
import type { CrudConfig } from './CrudPanel'

export const batchConfig: CrudConfig<Batch> = {
  title: 'Batches',
  description: 'The timetable in “Upcoming batches”. A hidden batch stays here but is not shown to visitors.',
  path: '/admin/batches',
  noun: 'batch',
  plural: 'batches',
  nameKey: 'name',
  visibleKey: 'active',
  preview: '#batches',
  fields: [
    { key: 'name', label: 'Batch name', type: 'text', required: true, wide: true, maxLength: 120 },
    { key: 'track', label: 'Track', type: 'text', required: true, maxLength: 60, placeholder: 'JEE Main + Adv' },
    { key: 'days', label: 'Days', type: 'text', required: true, maxLength: 60, placeholder: 'Mon · Wed · Fri' },
    { key: 'time', label: 'Time', type: 'text', required: true, maxLength: 40, placeholder: '16:00–18:00' },
    { key: 'starts_on', label: 'Start date', type: 'date', required: true },
    {
      key: 'status', label: 'Seats', type: 'select',
      options: Object.entries(BATCH_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    },
    { key: 'active', label: 'Show on the website', type: 'checkbox', wide: true },
  ],
  columns: [
    { label: 'Batch', render: (b) => <>{b.name}<small>{b.track}</small></> },
    { label: 'Days', render: (b) => b.days },
    { label: 'Time', render: (b) => b.time, mono: true },
    { label: 'Starts', render: (b) => formatDate(b.starts_on), mono: true },
    { label: 'Seats', render: (b) => <span className={`status ${b.status}`}>{BATCH_STATUS_LABEL[b.status]}</span> },
  ],
  blank: { name: '', track: '', days: '', time: '', starts_on: '', status: 'open', active: true },
}

export const programConfig: CrudConfig<Program> = {
  title: 'Programs',
  description: 'The course cards in the “Programs” section.',
  path: '/admin/programs',
  noun: 'program',
  plural: 'programs',
  nameKey: 'title',
  preview: '#programs',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true, maxLength: 120 },
    { key: 'code', label: 'Small label', type: 'text', required: true, maxLength: 40, placeholder: 'TRACK · JEE', hint: 'The coloured label above the title.' },
    { key: 'duration', label: 'Duration', type: 'text', maxLength: 40, placeholder: '1–2 years' },
    { key: 'classes', label: 'Classes', type: 'text', maxLength: 60, placeholder: '4 per week' },
    { key: 'summary', label: 'Summary', type: 'textarea', maxLength: 600 },
    { key: 'focus', label: 'Focus', type: 'text', maxLength: 120 },
    { key: 'tests', label: 'Tests', type: 'text', maxLength: 60 },
  ],
  columns: [
    { label: 'Title', render: (p) => p.title },
    { label: 'Label', render: (p) => p.code, mono: true },
    { label: 'Duration', render: (p) => p.duration },
    { label: 'Classes', render: (p) => p.classes },
  ],
  blank: { code: '', title: '', duration: '', summary: '', focus: '', classes: '', tests: '' },
}

export const testimonialConfig: CrudConfig<Testimonial> = {
  title: 'Reviews',
  description: 'Student results and quotes. Only add real students, with their permission. The section hides itself while nothing is shown.',
  path: '/admin/testimonials',
  noun: 'review',
  plural: 'reviews',
  nameKey: 'student_name',
  visibleKey: 'published',
  preview: '#results',
  fields: [
    { key: 'student_name', label: 'Student name', type: 'text', required: true, maxLength: 120 },
    { key: 'year', label: 'Year', type: 'text', maxLength: 10 },
    { key: 'score', label: 'Score', type: 'text', maxLength: 20, placeholder: '99.2', hint: 'The big number.' },
    { key: 'score_label', label: 'Score label', type: 'text', maxLength: 120, placeholder: 'out of 180 · NEET Physics' },
    { key: 'quote', label: 'What they said', type: 'textarea', maxLength: 600 },
    { key: 'published', label: 'Show on the website', type: 'checkbox', wide: true },
  ],
  columns: [
    { label: 'Student', render: (t) => t.student_name },
    { label: 'Year', render: (t) => t.year, mono: true },
    { label: 'Score', render: (t) => [t.score, t.score_label].filter(Boolean).join(' ') },
  ],
  blank: { student_name: '', year: String(new Date().getFullYear()), score: '', score_label: '', quote: '', published: true },
}
