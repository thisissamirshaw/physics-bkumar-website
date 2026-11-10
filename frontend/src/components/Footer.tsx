export default function Footer({ name }: { name?: string }) {
  return (
    <footer className="site">
      <div className="wrap foot">
        <span>
          © {new Date().getFullYear()} {name ?? 'Physics by B. Kumar'} · New Delhi
        </span>
        <span className="eq">F = dp/dt</span>
      </div>
    </footer>
  )
}
