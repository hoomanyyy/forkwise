import { useEffect, useState } from "react"
import { Navigate, Outlet, useNavigate } from "react-router-dom"
import { Menu, PanelLeftOpen } from "lucide-react"
import Sidebar from "../../components/app/Sidebar"
import { LogoMark } from "../../components/ui/Logo"
import { useStore } from "../../lib/store"

export default function AppShell() {
  const { user, ready, theme } = useStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("fw-sidebar") === "closed"
    } catch (problem) {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem("fw-sidebar", collapsed ? "closed" : "open")
    } catch (problem) {
      return
    }
  }, [collapsed])

  useEffect(() => {
    function key(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        navigate("/app")
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault()
        setCollapsed((value) => !value)
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [navigate])

  if (!ready) {
    return <div className="boot"><LogoMark size={48} thinking /></div>
  }
  if (!user) return <Navigate to={"/login?next=" + encodeURIComponent(window.location.pathname + window.location.search)} replace />

  return (
    <div className={"shell" + (collapsed ? " sidebar-closed" : "")}>
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(true)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="main">
        <div className="mobile-bar">
          <button className="icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <LogoMark size={24} />
        </div>
        {collapsed && (
          <button className="icon-btn open-sidebar desktop-only" title="Show sidebar (Ctrl B)" onClick={() => setCollapsed(false)}><PanelLeftOpen size={17} /></button>
        )}
        <Outlet />
      </main>
    </div>
  )
}
