import type { Fact } from '../types'

export default function Facts({ facts }: { facts?: Fact[] }) {
  if (facts && facts.length === 0) return null
  const items = facts ?? Array.from({ length: 4 }, () => null)
  return (
    <div className="facts">
      <div className="wrap facts-row">
        {items.map((f, i) => (
          <div className="fact" key={i}>
            <strong>{f ? f.value : <span className="skeleton" style={{ width: '3ch' }} />}</strong>
            <span>{f ? f.label : <span className="skeleton" style={{ width: '14ch' }} />}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
