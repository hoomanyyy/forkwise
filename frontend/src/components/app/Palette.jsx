import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { BookOpen, Code2, CornerDownLeft, FolderKanban, Gauge, MessageSquare, Palette as PaletteIcon, Plus, Search, Settings, ShieldCheck, Sparkles } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

export function openPalette() {
  window.dispatchEvent(new Event("fw-palette"))
}

export default function Palette() {
  const { chats, user } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const [found, setFound] = useState(null)
  const input = useRef(null)
  const list = useRef(null)

  useEffect(() => {
    function show() {
      setOpen(true)
    }
    function key(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener("fw-palette", show)
    window.addEventListener("keydown", key)
    return () => {
      window.removeEventListener("fw-palette", show)
      window.removeEventListener("keydown", key)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      setIndex(0)
      setFound(null)
      setTimeout(() => input.current && input.current.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setFound(null)
      return undefined
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get("/api/search?q=" + encodeURIComponent(query.trim()))
        setFound(data.results)
      } catch (problem) {
        setFound(null)
      }
    }, 220)
    return () => clearTimeout(timer)
  }, [query, open])

  const items = useMemo(() => {
    const actions = [
      { group: "Create", label: "New chat", icon: MessageSquare, to: "/app", hint: "Ask or build anything" },
      { group: "Create", label: "New code session", icon: Code2, to: "/app/code", hint: "Build software" },
      { group: "Create", label: "New design", icon: PaletteIcon, to: "/app/design", hint: "Pages and screens" },
      { group: "Create", label: "New project", icon: Plus, to: "/app/projects?new=1", hint: "Shared files for many chats" },
      { group: "Go to", label: "Projects", icon: FolderKanban, to: "/app/projects" },
      { group: "Go to", label: "Customize", icon: Sparkles, to: "/app/customize" },
      { group: "Go to", label: "Settings", icon: Settings, to: "/app/settings" },
      { group: "Go to", label: "Plan and billing", icon: Gauge, to: "/app/billing" },
      { group: "Go to", label: "Help and docs", icon: BookOpen, to: "/docs", external: true },
    ]
    if (user && user.is_admin) actions.push({ group: "Go to", label: "Admin", icon: ShieldCheck, to: "/app/admin" })
    const text = query.trim().toLowerCase()
    const matchedActions = text === "" ? actions : actions.filter((item) => item.label.toLowerCase().indexOf(text) >= 0)
    const source = found || chats
    const matchedChats = []
    for (const chat of source) {
      if (text === "" || found || chat.title.toLowerCase().indexOf(text) >= 0) matchedChats.push({ group: "Chats", label: chat.title, icon: chat.kind === "code" ? Code2 : chat.kind === "design" ? PaletteIcon : MessageSquare, to: "/app/c/" + chat.id })
      if (matchedChats.length >= 8) break
    }
    return matchedActions.concat(matchedChats)
  }, [query, chats, found, user])

  useEffect(() => {
    setIndex(0)
  }, [query])

  useEffect(() => {
    if (!list.current) return
    const node = list.current.querySelector(".palette-item.active")
    if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" })
  }, [index])

  function choose(item) {
    setOpen(false)
    if (item.external) window.open(item.to, "_blank", "noreferrer")
    else navigate(item.to)
  }

  function key(event) {
    if (event.key === "Escape") {
      setOpen(false)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      setIndex((index + 1) % Math.max(items.length, 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setIndex((index - 1 + items.length) % Math.max(items.length, 1))
    } else if (event.key === "Enter" && items[index]) {
      event.preventDefault()
      choose(items[index])
    }
  }

  if (!open) return null
  let last = ""
  return createPortal(
    <div className="modal-root palette-root" role="presentation">
      <div className="modal-backdrop" onMouseDown={() => setOpen(false)} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={key}>
        <div className="palette-search">
          <Search size={18} />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats or jump to a page" dir="auto" aria-label="Search" />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={list}>
          {items.length === 0 && <div className="palette-empty">Nothing matches "{query}".</div>}
          {items.map((item, position) => {
            const Icon = item.icon
            const heading = item.group !== last
            last = item.group
            return (
              <div key={item.group + item.label + position}>
                {heading && <div className="palette-group">{item.group}</div>}
                <button type="button" className={"palette-item" + (position === index ? " active" : "")} onMouseEnter={() => setIndex(position)} onClick={() => choose(item)}>
                  <span className="palette-icon"><Icon size={16} /></span>
                  <span className="palette-label" dir="auto">{item.label}</span>
                  {item.hint && <span className="palette-hint">{item.hint}</span>}
                  {position === index && <CornerDownLeft size={14} className="palette-enter" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
