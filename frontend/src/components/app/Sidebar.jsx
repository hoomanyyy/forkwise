import { useEffect, useMemo, useRef, useState } from "react"
import { Link, NavLink, useNavigate, useParams } from "react-router-dom"
import { FolderKanban, LogOut, Moon, PanelLeftClose, Pin, Plus, Search, Settings, Sparkles, Sun, Trash2, X, MoreHorizontal, Pencil, LayoutTemplate, Gauge, ShieldCheck } from "lucide-react"
import { Wordmark } from "../ui/Logo"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

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

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }) {
  const { chats, user, theme, setTheme, setUser } = useStore()
  const params = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [found, setFound] = useState(null)

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

  async function logout() {
    await api.post("/api/auth/logout")
    setUser(null)
    navigate("/")
  }

  return (
    <>
      <div className={"sidebar-scrim" + (mobileOpen ? " show" : "")} onClick={onMobileClose} />
      <nav className={"sidebar" + (collapsed ? " collapsed" : "") + (mobileOpen ? " mobile-open" : "")}>
        <div className="sidebar-top">
          <Link to="/app" className="sidebar-brand" onClick={onMobileClose}><Wordmark size={26} /></Link>
          <button className="icon-btn desktop-only" title="Hide sidebar" onClick={onCollapse}><PanelLeftClose size={17} /></button>
          <button className="icon-btn mobile-only" title="Close" onClick={onMobileClose}><X size={17} /></button>
        </div>
        <button className="new-chat" onClick={() => { onMobileClose(); navigate("/app") }}>
          <Plus size={16} /><span>New chat</span><span className="kbd">Ctrl K</span>
        </button>
        <div className="sidebar-search">
          <Search size={14} />
          <input placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} dir="auto" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={13} /></button>}
        </div>
        <div className="sidebar-nav">
          <NavLink to="/app/projects" onClick={onMobileClose}><FolderKanban size={16} />Projects</NavLink>
          <NavLink to="/app/templates" onClick={onMobileClose}><LayoutTemplate size={16} />Templates</NavLink>
          <NavLink to="/app/settings/abilities" onClick={onMobileClose}><Sparkles size={16} />Abilities</NavLink>
          <NavLink to="/app/billing" onClick={onMobileClose}><Gauge size={16} />Plan and usage</NavLink>
          {user && user.is_admin && <NavLink to="/app/admin" onClick={onMobileClose}><ShieldCheck size={16} />Admin</NavLink>}
        </div>
        <div className="sidebar-chats">
          {groups.length === 0 && <div className="empty-small">{found ? "No chats match." : "Your chats appear here."}</div>}
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
          <Link to="/app/settings" className="me" onClick={onMobileClose}>
            <span className="avatar">{(user && (user.name || user.email) || "?").slice(0, 1).toUpperCase()}</span>
            <span className="me-text"><strong>{user && user.name}</strong><small>{user && user.email}</small></span>
          </Link>
          <button className="icon-btn" title="Switch theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          <Link className="icon-btn" title="Settings" to="/app/settings" onClick={onMobileClose}><Settings size={16} /></Link>
          <button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={16} /></button>
        </div>
      </nav>
    </>
  )
}
