const UNITS: { name: string; grade: string; chapters: string[] }[] = [
  {
    name: 'Mechanics',
    grade: 'Class 11',
    chapters: ['Units & dimensions', 'Kinematics', 'Laws of motion', 'Work, energy, power', 'Rotational motion', 'Gravitation', 'Properties of matter'],
  },
  {
    name: 'Heat & waves',
    grade: 'Class 11',
    chapters: ['Thermal properties', 'Thermodynamics', 'Kinetic theory', 'Oscillations (SHM)', 'Waves'],
  },
  {
    name: 'Electromagnetism',
    grade: 'Class 12',
    chapters: ['Electrostatics', 'Capacitance', 'Current electricity', 'Magnetism', 'EM induction', 'Alternating current', 'EM waves'],
  },
  { name: 'Optics', grade: 'Class 12', chapters: ['Ray optics', 'Optical instruments', 'Wave optics'] },
  { name: 'Modern physics', grade: 'Class 12', chapters: ['Dual nature', 'Atoms', 'Nuclei', 'Semiconductors'] },
]

export default function Syllabus() {
  return (
    <section className="block" id="syllabus">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Syllabus</span>
          <h2>Everything from units to nuclei</h2>
          <p>The full Class 11–12 physics syllabus, which is also the common ground of JEE and NEET.</p>
        </div>
        <div className="units">
          {UNITS.map((u) => (
            <div className="unit" key={u.name}>
              <div className="unit-name">
                {u.name}
                <small>{u.grade}</small>
              </div>
              <div className="chips">
                {u.chapters.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
