import { Link, NavLink } from 'react-router-dom'

const NET = [
  { href: 'https://todosobreall.tech', label: 'Inicio' },
  { href: 'https://noticiasweb3.todosobreall.tech', label: 'Noticias Web3' },
  { href: 'https://chat.todosobreall.tech', label: 'Telegram Web' },
  { href: 'https://resistenciaalacensura.todosobreall.tech', label: 'Resistencia' },
]

function Logo() {
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-[13px]"
      style={{ background: 'linear-gradient(135deg,#36b6f0,#5b8af1)', boxShadow: '0 6px 22px -6px #5b8af1' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 15l3-1 2 4 3-9 3 6 2-3h3" stroke="#04121f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function Layout({ children }) {
  return (
    <>
      {/* Netbar de la red */}
      <div className="border-b border-line bg-gradient-to-b from-white/[0.045] to-white/[0.012] text-[12.5px] backdrop-blur-sm">
        <div className="mx-auto flex max-w-wrap flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 sm:px-7">
          <span className="mr-1 flex items-center gap-2 border-r border-line pr-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal">
            <span className="h-[7px] w-[7px] rounded-[2px] bg-gradient-to-br from-cyan to-blue" />
            Red Telebots
          </span>
          {NET.map((n) => (
            <a key={n.href} href={n.href} className="text-muted transition hover:text-ink">
              {n.label}
            </a>
          ))}
          <span className="ml-auto inline-flex items-center gap-2 font-medium text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_9px_#3ee0c7]" />
            Canales
          </span>
        </div>
      </div>

      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b border-line bg-[rgba(8,12,22,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-wrap items-center gap-6 px-5 py-3.5 sm:px-7">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="font-display text-[18px] font-bold leading-tight tracking-tight">
              Canales
              <small className="block font-body text-[11px] font-medium text-muted">Estadísticas de Telegram</small>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-7 md:flex">
            <TopLink to="/">Directorio</TopLink>
            <TopLink to="/ranking">Ranking</TopLink>
          </nav>

          <a
            href="https://t.me/comunidadtelebots"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal to-cyan px-4 py-2 text-sm font-semibold text-bg shadow-glow transition hover:-translate-y-0.5 md:ml-0"
          >
            + Añade tu canal
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-wrap px-5 pb-24 pt-8 sm:px-7">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-wrap flex-wrap items-center justify-between gap-3 px-5 py-7 text-[13px] text-muted sm:px-7">
          <span>
            <span className="text-grad font-display font-bold">Canales</span> · un proyecto de ComunidadTelebots
          </span>
          <span className="font-mono text-xs">canales.todosobreall.tech · datos de demostración</span>
        </div>
      </footer>
    </>
  )
}

function TopLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `relative py-1 text-sm font-medium transition after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded after:bg-teal after:transition-transform ${
          isActive ? 'text-ink after:scale-x-100' : 'text-muted after:scale-x-0 hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
