import type { DocConfig, DocGroup } from './DocPanel'
import type { Field } from './fields'

// ---------- Home page top: hero and announcement ----------

export const home: DocConfig = {
  source: 'page',
  title: 'Home page top',
  description: 'The first screen visitors see: the headline, the buttons, and an optional announcement strip above the menu.',
  preview: '',
  groups: [
    {
      title: 'Headline',
      fields: [
        { key: 'hero.eyebrow', label: 'Small line above the headline', type: 'text', wide: true, maxLength: 80 },
        { key: 'hero.title', label: 'Headline', type: 'text', required: true, maxLength: 160 },
        { key: 'hero.title_accent', label: 'Headline, coloured ending', type: 'text', maxLength: 80, hint: 'Shown in the accent colour after the headline.' },
        { key: 'hero.lede', label: 'Paragraph under the headline', type: 'textarea', maxLength: 600 },
      ],
    },
    {
      title: 'Buttons and tags',
      fields: [
        { key: 'hero.cta_primary', label: 'Main button', type: 'text', maxLength: 80, hint: 'Goes to the enquiry form. Leave empty to hide.' },
        { key: 'hero.cta_secondary', label: 'Second button', type: 'text', maxLength: 80, hint: 'Goes to Programs. Leave empty to hide.' },
        { key: 'hero.tracks', label: 'Tags under the buttons, one per line', type: 'lines', rows: 4, hint: 'Up to 8.' },
        { key: 'hero.show_simulation', label: 'Show the animated projectile diagram', type: 'checkbox', wide: true },
      ],
    },
    {
      title: 'Announcement strip',
      note: 'A thin dark strip at the very top, for news like “Admissions open for the 2027 session”.',
      fields: [
        { key: 'announcement.enabled', label: 'Show the announcement', type: 'checkbox', wide: true },
        { key: 'announcement.text', label: 'Announcement', type: 'text', wide: true, maxLength: 200 },
        { key: 'announcement.link_label', label: 'Link text', type: 'text', maxLength: 80, placeholder: 'Book a demo' },
        { key: 'announcement.link_url', label: 'Link goes to', type: 'text', maxLength: 400, placeholder: '#visit', hint: 'A section like #visit or #batches, or a full web address.' },
      ],
    },
  ],
}

// ---------- Method ----------

export const method: DocConfig = {
  source: 'page',
  title: 'Method',
  description: 'The numbered steps in the dark “Method” band. The heading above them is edited under Sections.',
  preview: '#method',
  groups: [
    {
      title: 'Steps',
      fields: [
        {
          key: 'method.steps', label: 'Steps, in teaching order', type: 'rows', noun: 'step', max: 8, blank: { title: '', text: '' },
          hint: 'Put a formula between backticks, like `v² = u² + 2as`, to set it in formula type.',
          columns: [
            { key: 'title', label: 'Step name', type: 'text', required: true, maxLength: 60, wide: true },
            { key: 'text', label: 'What happens in this step', type: 'textarea', rows: 2, maxLength: 300 },
          ],
        },
      ],
    },
  ],
}

// ---------- Syllabus ----------

export const syllabus: DocConfig = {
  source: 'page',
  title: 'Syllabus',
  description: 'The units and chapters in the “Syllabus” section. The heading above them is edited under Sections.',
  preview: '#syllabus',
  groups: [
    {
      title: 'Units',
      fields: [
        {
          key: 'syllabus.units', label: 'Units, in the order shown', type: 'rows', noun: 'unit', max: 16, blank: { name: '', grade: '', chapters: [] },
          columns: [
            { key: 'name', label: 'Unit name', type: 'text', required: true, maxLength: 60 },
            { key: 'grade', label: 'Class', type: 'text', maxLength: 40, placeholder: 'Class 11' },
            { key: 'chapters', label: 'Chapters, one per line', type: 'lines', rows: 5 },
          ],
        },
      ],
    },
  ],
}

// ---------- Teacher (site settings) ----------

export const teacher: DocConfig = {
  source: 'settings',
  title: 'Teacher',
  description: 'The teacher’s profile in the “Mentor” section.',
  preview: '#mentor',
  groups: [
    {
      title: 'Profile',
      fields: [
        { key: 'mentor_name', label: 'Name', type: 'text', required: true, maxLength: 120 },
        { key: 'mentor_quote', label: 'Quote', type: 'text', maxLength: 300, hint: 'Shown in large type. Quotation marks are added for you.' },
        { key: 'mentor_bio', label: 'Bio', type: 'textarea', rows: 6, maxLength: 2000, hint: 'Leave an empty line to start a new paragraph.' },
        { key: 'mentor_credentials', label: 'Credentials, one per line', type: 'lines', rows: 4, hint: 'Up to 8 short lines, e.g. “M.Sc. Physics, IIT Delhi”.' },
        { key: 'mentor_photo_url', label: 'Photo', type: 'image', maxLength: 400, hint: 'A portrait works best (taller than wide). Large photos are shrunk before upload. Press “Save changes” after uploading.' },
      ],
    },
  ],
}

// ---------- Facts strip (site settings) ----------

export const facts: DocConfig = {
  source: 'settings',
  title: 'Facts strip',
  description: 'The row of numbers under the headline. Only use figures that are true for the centre.',
  preview: '',
  groups: [
    {
      title: 'Facts',
      fields: [
        {
          key: 'facts', label: 'Up to four facts', type: 'rows', noun: 'fact', max: 4, blank: { value: '', label: '' },
          hint: 'Remove every fact to hide the strip.',
          columns: [
            { key: 'value', label: 'Number or word', type: 'text', maxLength: 20, placeholder: '25' },
            { key: 'label', label: 'What it means', type: 'text', maxLength: 60, placeholder: 'Students per batch, max' },
          ],
        },
      ],
    },
  ],
}

// ---------- Contact details (site settings) ----------

export const contact: DocConfig = {
  source: 'settings',
  title: 'Contact details',
  description: 'The centre’s name, address, phone and hours. These show in the “Visit” section and the footer.',
  preview: '#visit',
  groups: [
    {
      title: 'Centre',
      fields: [
        { key: 'centre_name', label: 'Centre name', type: 'text', required: true, maxLength: 120, hint: 'Shown in the menu bar and the footer.' },
        { key: 'hours', label: 'Opening hours', type: 'text', maxLength: 120, placeholder: 'Mon–Sat, 10:00–21:00' },
        { key: 'address', label: 'Address', type: 'text', wide: true, maxLength: 300 },
        { key: 'maps_url', label: 'Google Maps link', type: 'text', wide: true, maxLength: 600, hint: 'Leave empty to hide the “Open in Google Maps” button.' },
      ],
    },
    {
      title: 'Phone, WhatsApp and email',
      fields: [
        { key: 'phone', label: 'Phone, as shown', type: 'text', maxLength: 30, placeholder: '+91 98100 12345' },
        { key: 'whatsapp', label: 'WhatsApp number', type: 'text', maxLength: 20, placeholder: '919810012345', hint: 'Digits only, with the country code. Leave empty to hide the WhatsApp button.' },
        { key: 'email', label: 'Email', type: 'text', maxLength: 120, hint: 'Leave empty to hide it.' },
        { key: 'batch_session', label: 'Batch session label', type: 'text', maxLength: 60, placeholder: '2027 session', hint: 'Shown next to “Batches”.' },
      ],
    },
  ],
}

// ---------- Sections: show / hide and headings ----------

const SECTION_NOTES: [key: string, title: string, note: string, parts: ('eyebrow' | 'title' | 'intro')[]][] = [
  ['facts', 'Facts strip', 'The row of numbers under the headline.', []],
  ['programs', 'Programs', 'The course cards.', ['eyebrow', 'title', 'intro']],
  ['method', 'Method', 'The dark band with the numbered teaching steps.', ['eyebrow', 'title', 'intro']],
  ['syllabus', 'Syllabus', 'Units and chapters.', ['eyebrow', 'title', 'intro']],
  ['mentor', 'Teacher', 'The teacher’s profile. The teacher’s name is the heading.', ['eyebrow']],
  ['results', 'Reviews', 'Student results. Stays hidden while no review is published.', ['eyebrow', 'title', 'intro']],
  ['batches', 'Batches', 'The timetable.', ['eyebrow', 'title', 'intro']],
  ['visit', 'Visit and enquiry form', 'Address, phone and the demo-class form.', ['eyebrow', 'title', 'intro']],
]

const PART: Record<'eyebrow' | 'title' | 'intro', Omit<Field, 'key'>> = {
  eyebrow: { label: 'Small label', type: 'text', maxLength: 80 },
  title: { label: 'Heading', type: 'text', maxLength: 160 },
  intro: { label: 'Intro line', type: 'textarea', rows: 2, maxLength: 400 },
}

export const sections: DocConfig = {
  source: 'page',
  title: 'Sections',
  description: 'Turn each part of the home page on or off, and edit its heading. A hidden section also leaves the menu.',
  preview: '',
  groups: SECTION_NOTES.map(([key, title, note, parts]): DocGroup => ({
    title,
    note,
    fields: [
      { key: `sections.${key}.show`, label: 'Show on the website', type: 'checkbox', wide: true },
      ...parts.map((part): Field => ({ ...PART[part], key: `sections.${key}.${part}` })),
    ],
  })),
}

// ---------- Enquiry form ----------

export const form: DocConfig = {
  source: 'page',
  title: 'Enquiry form',
  description: 'The “Book a free demo class” form: its wording, the choices it offers, and whether it takes requests.',
  preview: '#visit',
  groups: [
    {
      title: 'Taking requests',
      fields: [
        { key: 'form.enabled', label: 'Accept demo-class requests', type: 'checkbox', wide: true, hint: 'Turn off when batches are full. Visitors see the message below with call and WhatsApp buttons.' },
        { key: 'form.closed_text', label: 'Message while requests are off', type: 'textarea', rows: 2, maxLength: 300 },
      ],
    },
    {
      title: 'Wording',
      fields: [
        { key: 'form.title', label: 'Form heading', type: 'text', maxLength: 80 },
        { key: 'form.button_label', label: 'Button', type: 'text', maxLength: 80 },
        { key: 'form.note', label: 'Line under the button', type: 'text', wide: true, maxLength: 160 },
        { key: 'form.message_placeholder', label: 'Example text in the message box', type: 'text', wide: true, maxLength: 160 },
      ],
    },
    {
      title: 'Choices',
      note: 'Changing a choice does not change enquiries already received.',
      fields: [
        { key: 'form.classes', label: 'Classes, one per line', type: 'lines', rows: 5, hint: 'At least one, up to 12.' },
        { key: 'form.targets', label: 'Targets, one per line', type: 'lines', rows: 5, hint: 'At least one, up to 12.' },
      ],
    },
    {
      title: 'WhatsApp button',
      fields: [
        { key: 'form.whatsapp_message', label: 'Message a visitor starts with', type: 'textarea', rows: 2, maxLength: 300, hint: 'Typed for them when they press “WhatsApp us”. The number is under Contact details.' },
      ],
    },
  ],
}

// ---------- Branding & SEO ----------

export const branding: DocConfig = {
  source: 'page',
  title: 'Branding & SEO',
  description: 'The logo letters, accent colour and footer, and how the site appears in Google and when shared.',
  preview: '',
  groups: [
    {
      title: 'Menu bar',
      fields: [
        { key: 'branding.brand_mark', label: 'Logo letters', type: 'text', required: true, maxLength: 3, hint: 'One to three letters in the dark square.' },
        { key: 'branding.brand_sub', label: 'Small line under the name', type: 'text', maxLength: 80 },
        { key: 'branding.header_cta', label: 'Menu bar button', type: 'text', maxLength: 40, hint: 'Leave empty to hide.' },
        {
          key: 'branding.accent', label: 'Accent colour', type: 'select',
          options: [
            { value: 'blue', label: 'Blue (default)' }, { value: 'teal', label: 'Teal' }, { value: 'violet', label: 'Violet' },
            { value: 'crimson', label: 'Crimson' }, { value: 'amber', label: 'Amber' },
          ],
          hint: 'Used for links, tags and the “Visit” card.',
        },
      ],
    },
    {
      title: 'Footer',
      fields: [
        { key: 'branding.footer_note', label: 'After the centre name', type: 'text', maxLength: 80, placeholder: 'New Delhi' },
        { key: 'branding.footer_equation', label: 'Equation on the right', type: 'text', maxLength: 40, placeholder: 'F = dp/dt' },
      ],
    },
    {
      title: 'Search and sharing',
      note: 'The title is the blue link in Google results and the name on the browser tab. The description is the grey text under it.',
      fields: [
        { key: 'seo.title', label: 'Page title', type: 'text', wide: true, maxLength: 120, hint: 'Aim for under 60 characters so Google does not cut it.' },
        { key: 'seo.description', label: 'Description', type: 'textarea', rows: 3, maxLength: 300, hint: 'One or two sentences, about 150 characters.' },
      ],
    },
  ],
}

// ---------- Site status ----------

export const status: DocConfig = {
  source: 'page',
  title: 'Site status',
  description: 'Close the website to visitors for a while, for example during a big update. The console keeps working.',
  preview: '',
  groups: [
    {
      title: 'Maintenance page',
      note: 'While closed, visitors see only the message below with call and WhatsApp buttons. “See on website” from the console still shows the full site.',
      fields: [
        { key: 'status.maintenance', label: 'Close the website for maintenance', type: 'checkbox', wide: true },
        { key: 'status.maintenance_title', label: 'Heading', type: 'text', wide: true, maxLength: 160 },
        { key: 'status.maintenance_message', label: 'Message', type: 'textarea', rows: 3, maxLength: 400 },
      ],
    },
  ],
}
