const LINKS = [
  ['#programs', 'Programs'],
  ['#method', 'Method'],
  ['#mentor', 'Mentor'],
  ['#batches', 'Batches'],
  ['#visit', 'Visit'],
] as const

export default function Header() {
  return (
    <header className="site">
      <div className="wrap nav">
        <a className="brand" href="#top" aria-label="Physics by B. Kumar, home">
          <span className="brand-mark">BK</span>
          <span className="brand-name">
            Physics by B. Kumar<small>Class 11–12 · JEE · NEET</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn-primary" href="#visit">
          Book a demo class
        </a>
      </div>
    </header>
  )
}
