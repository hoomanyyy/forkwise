import { NavLink, Outlet } from "react-router-dom"
import { Sparkles } from "lucide-react"

const links = [{ to: "/", label: "Home" }]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Sparkles size={18} /></span>
            App
          </NavLink>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end
                className={({ isActive }) => "rounded-lg px-3 py-2 text-sm font-medium transition " +
                  (isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100")}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} App
      </footer>
    </div>
  )
}
