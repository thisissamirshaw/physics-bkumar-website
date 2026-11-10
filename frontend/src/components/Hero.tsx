import ProjectileCanvas from './ProjectileCanvas'

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Physics coaching · New Delhi</span>
          <h1>
            Physics, built from <em>first principles.</em>
          </h1>
          <p className="hero-lede">
            Small batches for Class 11 and 12, JEE Main &amp; Advanced, and NEET. Every chapter is derived, then
            drilled, then tested.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#visit">
              Book a free demo class <span className="arrow">→</span>
            </a>
            <a className="btn btn-ghost" href="#programs">
              See programs
            </a>
          </div>
          <div className="tracks" aria-label="Tracks offered">
            <span>CBSE 11–12</span>
            <span>JEE Main</span>
            <span>JEE Advanced</span>
            <span>NEET</span>
          </div>
        </div>
        <ProjectileCanvas />
      </div>
    </section>
  )
}
