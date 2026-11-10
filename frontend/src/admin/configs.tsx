import { formatDate } from '../components/Batches'
import { BATCH_STATUS_LABEL, type Batch, type Program, type Testimonial } from '../types'
import type { CrudConfig } from './CrudPanel'

export const batchConfig: CrudConfig<Batch> = {
  title: 'Batches',
  description: 'The timetable shown in “Upcoming batches”. Hidden batches stay here but do not appear on the site.',
  path: '/admin/batches',
  noun: 'batch',
  fields: [
    { key: 'name', label: 'Batch name', type: 'text', required: true, wide: true },
    { key: 'track', label: 'Track', type: 'text', required: true },
    { key: 'days', label: 'Days', type: 'text', required: true, hint: 'e.g. Mon · Wed · Fri' },
    { key: 'time', label: 'Time', type: 'text', required: true, hint: 'e.g. 16:00–18:00' },
    { key: 'starts_on', label: 'Start date', type: 'date', required: true },
    {
      key: 'status', label: 'Seats', type: 'select',
      options: Object.entries(BATCH_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    },
    { key: 'sort_order', label: 'Order on page', type: 'number', hint: 'Lower numbers show first' },
    { key: 'active', label: 'Show on website', type: 'checkbox', wide: true },
  ],
  columns: [
    { label: 'Batch', render: (b) => b.name },
    { label: 'Track', render: (b) => b.track },
    { label: 'Days', render: (b) => b.days },
    { label: 'Time', render: (b) => b.time, mono: true },
    { label: 'Starts', render: (b) => formatDate(b.starts_on), mono: true },
    { label: 'Seats', render: (b) => <span className={`status ${b.status}`}>{BATCH_STATUS_LABEL[b.status]}</span> },
    { label: 'On site', render: (b) => (b.active ? 'Shown' : <span className="adm-muted">Hidden</span>) },
  ],
  blank: { name: '', track: '', days: '', time: '', starts_on: '', status: 'open', active: true, sort_order: 0 },
}

export const programConfig: CrudConfig<Program> = {
  title: 'Programs',
  description: 'The course cards in the “Programs” section.',
  path: '/admin/programs',
  noun: 'program',
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'code', label: 'Label', type: 'text', required: true, hint: 'Small blue label, e.g. TRACK · JEE' },
    { key: 'duration', label: 'Duration', type: 'text' },
    { key: 'sort_order', label: 'Order on page', type: 'number' },
    { key: 'summary', label: 'Summary', type: 'textarea' },
    { key: 'focus', label: 'Focus', type: 'text' },
    { key: 'classes', label: 'Classes', type: 'text', hint: 'e.g. 4 per week' },
    { key: 'tests', label: 'Tests', type: 'text', wide: true },
  ],
  columns: [
    { label: 'Title', render: (p) => p.title },
    { label: 'Label', render: (p) => p.code, mono: true },
    { label: 'Duration', render: (p) => p.duration },
    { label: 'Classes', render: (p) => p.classes },
    { label: 'Order', render: (p) => p.sort_order, mono: true },
  ],
  blank: { code: '', title: '', duration: '', summary: '', focus: '', classes: '', tests: '', sort_order: 0 },
}

export const testimonialConfig: CrudConfig<Testimonial> = {
  title: 'Reviews',
  description: 'Student results and quotes. Only add real students, with their permission. The section hides itself when nothing is published.',
  path: '/admin/testimonials',
  noun: 'review',
  fields: [
    { key: 'student_name', label: 'Student name', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'text' },
    { key: 'score', label: 'Score', type: 'text', hint: 'e.g. 99.2 or 168' },
    { key: 'score_label', label: 'Score label', type: 'text', hint: 'e.g. out of 180 · NEET Physics' },
    { key: 'quote', label: 'What they said', type: 'textarea' },
    { key: 'sort_order', label: 'Order on page', type: 'number' },
    { key: 'published', label: 'Show on website', type: 'checkbox' },
  ],
  columns: [
    { label: 'Student', render: (t) => t.student_name },
    { label: 'Year', render: (t) => t.year, mono: true },
    { label: 'Score', render: (t) => `${t.score} ${t.score_label}` },
    { label: 'On site', render: (t) => (t.published ? 'Shown' : <span className="adm-muted">Hidden</span>) },
  ],
  blank: { student_name: '', year: String(new Date().getFullYear()), score: '', score_label: '', quote: '', published: true, sort_order: 0 },
}
