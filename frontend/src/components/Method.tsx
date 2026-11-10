// The teaching order is a real sequence, so the steps are numbered.
export default function Method() {
  return (
    <section className="block method" id="method">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Method</span>
          <h2>How every chapter is taught</h2>
          <p>The same four steps, in the same order, for every topic from kinematics to semiconductors.</p>
        </div>
        <ol className="steps">
          <li>
            <span className="n">01</span>
            <h3>Concept</h3>
            <p>Start from what is physically happening, with a diagram on the board before any formula.</p>
          </li>
          <li>
            <span className="n">02</span>
            <h3>Derivation</h3>
            <p>
              Build the result yourself, so <code>v² = u² + 2as</code> is something you can rebuild, not memorise.
            </p>
          </li>
          <li>
            <span className="n">03</span>
            <h3>Problems</h3>
            <p>Graded sets, from NCERT to JEE Advanced, solved in class and then on your own.</p>
          </li>
          <li>
            <span className="n">04</span>
            <h3>Test &amp; review</h3>
            <p>A timed chapter test, then a one-on-one review of every mistake.</p>
          </li>
        </ol>
      </div>
    </section>
  )
}
