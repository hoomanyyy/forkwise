import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { BookOpen, ChevronsUpDown, Code2, Gauge, LogOut, MessageSquare, MoreHorizontal, PanelLeftClose, Palette, Pencil, Pin, Plus, Search, Settings, ShieldCheck, Sparkles, Trash2, X, Zap } from "lucide-react"
import { Wordmark } from "../ui/Logo"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { SECTIONS } from "../../lib/kinds"

function groupChats(chats) {
  const now = Date.now() / 1000
  const groups = [
    { label: "Pinned", items: [] },
    { label: "Today", items: [] },
    { label: "Last 7 days", items: [] },
    { label: "Last 30 days", items: [] },
    { label: "Older", items: [] },
  ]
  for (const chat of chats) {
    const age = now - chat.updated_at
    if (chat.pinned) groups[0].items.push(chat)
    else if (age < 86400) groups[1].items.push(chat)
    else if (age < 7 * 86400) groups[2].items.push(chat)
    else if (age < 30 * 86400) groups[3].items.push(chat)
    else groups[4].items.push(chat)
  }
  return groups.filter((group) => group.items.length > 0)
}

function ChatRow({ chat, active, onClose }) {
  const { patchChat, removeChat, toast } = useStore()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chat.title)
  const ref = useRef(null)

  useEffect(() => {
    if (!menu) return undefined
    function click(event) {
      if (ref.current && !ref.current.contains(event.target)) setMenu(false)
    }
    document.addEventListener("mousedown", click)
    return () => document.removeEventListener("mousedown", click)
  }, [menu])

  async function rename() {
    setEditing(false)
    if (!title.trim() || title === chat.title) return
    await api.patch("/api/chats/" + chat.id, { title })
    patchChat(chat.id, { title })
  }

  async function pin() {
    setMenu(false)
    await api.patch("/api/chats/" + chat.id, { pinned: !chat.pinned })
    patchChat(chat.id, { pinned: !chat.pinned })
  }

  async function remove() {
    setMenu(false)
    if (!window.confirm("Delete this chat and its files?")) return
    await api.del("/api/chats/" + chat.id)
    removeChat(chat.id)
    toast("Chat deleted")
    if (active) navigate("/app")
  }

  if (editing) {
    return (
      <div className="chat-row editing">
        <input autoFocus dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === "Enter") rename(); if (e.key === "Escape") setEditing(false) }} />
      </div>
    )
  }

  return (
    <div className={"chat-row" + (active ? " active" : "")} ref={ref}>
      <Link to={"/app/c/" + chat.id} onClick={onClose} dir="auto">
        {chat.running && <span className="run-dot" />}
        {!chat.running && chat.kind === "code" && <Code2 size={13} className="chat-kind" />}
        {!chat.running && chat.kind === "design" && <Palette size={13} className="chat-kind" />}
        <span className="chat-title">{chat.title}</span>
      </Link>
      <button type="button" className="chat-more" aria-label="Chat options" onClick={() => setMenu(!menu)}><MoreHorizontal size={15} /></button>
      {menu && (
        <div className="popover row-menu">
          <button className="pop-item" onClick={() => { setMenu(false); setEditing(true) }}><Pencil size={14} /><span>Rename</span></button>
          <button className="pop-item" onClick={pin}><Pin size={14} /><span>{chat.pinned ? "Unpin" : "Pin"}</span></button>
          <button className="pop-item danger" onClick={remove}><Trash2 size={14} /><span>Delete</span></button>
        </div>
      )}
    </div>
  )
}

function sectionOf(pathname, chats) {
  if (pathname.indexOf("/app/code") === 0) return "code"
  if (pathname.indexOf("/app/design") === 0) return "design"
  if (pathname.indexOf("/app/customize") === 0) return "customize"
  if (pathname.indexOf("/app/c/") === 0) {
    const id = pathname.split("/")[3]
    const found = chats.find((item) => item.id === id)
    if (found && found.kind === "code") return "code"
    if (found && found.kind === "design") return "design"
    return "chat"
  }
  if (pathname === "/app" || pathname === "/app/") return "chat"
  return ""
}

function UserMenu({ onClose }) {
  const { user, signOut } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState("free")
  const ref = useRef(null)

  useEffect(() => {
    api.get("/api/billing").then((data) => setPlan(data.plan)).catch(() => setPlan("free"))
  }, [])

  useEffect(() => {
    if (!open) return undefined
    function click(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener("mousedown", click)
    return () => document.removeEventListener("mousedown", click)
  }, [open])

  async function logout() {
    await api.post("/api/auth/logout")
    signOut()
    navigate("/")
  }

  function go(path) {
    setOpen(false)
    onClose()
    navigate(path)
  }

  return (
    <div className="user-menu-wrap" ref={ref}>
      {plan === "free" && <button className="upgrade-pill" onClick={() => go("/app/billing")}><Zap size={14} />Upgrade to Pro</button>}
      {open && (
        <div className="popover user-menu" role="menu">
          <div className="user-menu-head"><strong>{user.name || user.email}</strong><span className="muted small">{user.email}</span></div>
          <button className="pop-item" role="menuitem" onClick={() => go("/app/settings")}><Settings size={15} /><span>Settings</span></button>
          <button className="pop-item" role="menuitem" onClick={() => go("/app/billing")}><Gauge size={15} /><span>Billing</span><span className={"chip plan-" + plan}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span></button>
          <button className="pop-item" role="menuitem" onClick={() => go("/app/customize")}><Sparkles size={15} /><span>Customize</span></button>
          {user.is_admin && <button className="pop-item" role="menuitem" onClick={() => go("/app/admin")}><ShieldCheck size={15} /><span>Admin</span></button>}
          <div className="pop-sep" />
          <a className="pop-item" role="menuitem" href="/docs" target="_blank" rel="noreferrer"><BookOpen size={15} /><span>Help and docs</span></a>
          <button className="pop-item" role="menuitem" onClick={logout}><LogOut size={15} /><span>Sign out</span></button>
        </div>
      )}
      <button className="me" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{(user && (user.name || user.email) || "?").slice(0, 1).toUpperCase()}</span>
        <span className="me-text"><strong>{user && user.name}</strong><small>{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</small></span>
        <ChevronsUpDown size={15} className="me-chevron" />
      </button>
    </div>
  )
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }) {
  const { chats, chatsReady } = useStore()
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [found, setFound] = useState(null)
  const section = sectionOf(location.pathname, chats)
  const current = SECTIONS.find((item) => item.key === section)

  useEffect(() => {
    if (query.trim().length < 2) {
      setFound(null)
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get("/api/search?q=" + encodeURIComponent(query.trim()))
        setFound(data.results)
      } catch (problem) {
        setFound([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const groups = useMemo(() => groupChats(found || chats), [found, chats])
  const newTarget = current && current.newLabel ? current : SECTIONS[0]

  return (
    <>
      <div className={"sidebar-scrim" + (mobileOpen ? " show" : "")} onClick={onMobileClose} />
      <nav className={"sidebar" + (collapsed ? " collapsed" : "") + (mobileOpen ? " mobile-open" : "")}>
        <div className="sidebar-top">
          <Link to="/app" className="sidebar-brand" onClick={onMobileClose}><Wordmark size={26} /></Link>
          <button className="icon-btn desktop-only" title="Hide sidebar" onClick={onCollapse}><PanelLeftClose size={17} /></button>
          <button className="icon-btn mobile-only" title="Close" onClick={onMobileClose}><X size={17} /></button>
        </div>
        <div className="sidebar-sections">
          {SECTIONS.map((item) => {
            const Icon = item.icon
            return <Link key={item.key} to={item.to} className={"section-link" + (section === item.key ? " active" : "")} onClick={onMobileClose}><Icon size={17} />{item.label}</Link>
          })}
        </div>
        <button className="new-chat" onClick={() => { onMobileClose(); navigate(newTarget.to) }}>
          <Plus size={16} /><span>{newTarget.newLabel}</span><span className="kbd">Ctrl K</span>
        </button>
        <div className="sidebar-search">
          <Search size={14} />
          <input placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} dir="auto" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={13} /></button>}
        </div>
        <div className="sidebar-chats">
          {!chatsReady && !found && <div className="skel-list"><span /><span /><span /><span /></div>}
          {chatsReady && groups.length === 0 && <div className="empty-small">{found ? "No chats match." : "Your chats appear here."}</div>}
          {groups.map((group) => (
            <div key={group.label} className="chat-group">
              <div className="chat-group-label">{group.label}</div>
              {group.items.map((chat) => (
                <ChatRow key={chat.id} chat={chat} active={params.chatId === chat.id} onClose={onMobileClose} />
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-foot">
          <UserMenu onClose={onMobileClose} />
        </div>
      </nav>
    </>
  )
}
