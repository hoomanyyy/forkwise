import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import {
    FaHome, FaPlus, FaFlask, FaComments, FaDatabase, FaThLarge, FaChartPie, FaReceipt, FaCog, FaBook,
    FaLifeRing, FaShieldAlt, FaSearch, FaBars, FaTimes, FaSignOutAlt, FaArrowUp, FaChevronDown, FaExternalLinkAlt
} from "react-icons/fa"
import Logo from "../../images/logo.svg"
import Seo from "../Seo"
import { sendAuthRequestWithWebsocket, getMe, getHistory, Logout } from "../../api"
import "../../styles/app.css"

export const MeContext = createContext({ name: "", usage: null, user: null, ready: false })

export function useMe() {
    return useContext(MeContext)
}

const MAIN_LINKS = [
    { to: "/dashboard", icon: FaHome, label: "Overview" },
    { to: "/chat", icon: FaPlus, label: "New analysis" },
    { to: "/runs", icon: FaFlask, label: "Runs" },
    { to: "/assistant", icon: FaComments, label: "Assistant" },
    { to: "/datasets", icon: FaDatabase, label: "Datasets" },
    { to: "/templates", icon: FaThLarge, label: "Templates" }
]

const ACCOUNT_LINKS = [
    { to: "/usage", icon: FaChartPie, label: "Usage" },
    { to: "/invoices", icon: FaReceipt, label: "Billing" },
    { to: "/settings", icon: FaCog, label: "Settings" }
]

function SideLink({ item }) {
    return (
        <NavLink to={item.to} end={item.to === "/dashboard"} className={({ isActive }) => (isActive ? "ap-link ap-link-on" : "ap-link")}>
            <item.icon /> <span>{item.label}</span>
        </NavLink>
    )
}

function CommandPalette({ onClose, isAdmin }) {
    const navigate = useNavigate()
    const [text, setText] = useState("")
    const [runs, setRuns] = useState([])
    const [index, setIndex] = useState(0)
    const inputRef = useRef(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
        async function load() {
            try {
                const data = await getHistory()
                if (data.Message === true) {
                    setRuns(data.data)
                }
            } catch (e) {
                setRuns([])
            }
        }
        load()
    }, [])

    const pages = [...MAIN_LINKS, ...ACCOUNT_LINKS, { to: "/help", label: "Help and support" }, { to: "/docs", label: "Documentation" }, { to: "/pricing", label: "Plans and pricing" }]
    if (isAdmin) {
        pages.push({ to: "/admin", label: "Admin panel" })
    }

    const word = text.trim().toLowerCase()
    const items = []
    for (const p of pages) {
        if (p.label.toLowerCase().includes(word)) {
            items.push({ group: "Pages", label: p.label, to: p.to })
        }
    }
    for (const r of runs) {
        if (r.question.toLowerCase().includes(word) || String(r.id).includes(word)) {
            items.push({ group: "Runs", label: "#" + r.id + " " + r.question, to: "/runs/" + r.id })
        }
    }
    const shown = items.slice(0, 12)

    function go(item) {
        onClose()
        navigate(item.to)
    }

    function onKey(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setIndex(Math.min(shown.length - 1, index + 1))
        }
        if (e.key === "ArrowUp") {
            e.preventDefault()
            setIndex(Math.max(0, index - 1))
        }
        if (e.key === "Enter" && shown[index]) {
            go(shown[index])
        }
    }

    let lastGroup = ""
    return (
        <div className="cp-back" onClick={onClose}>
            <div className="cp" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
                <div className="cp-input">
                    <FaSearch />
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setIndex(0) }}
                        onKeyDown={onKey}
                        placeholder="Search pages and runs"
                    />
                    <span className="fw-kbd">Esc</span>
                </div>
                <div className="cp-list">
                    {shown.length === 0 && <p className="cp-empty">Nothing matches "{text}".</p>}
                    {shown.map((item, i) => {
                        const header = item.group !== lastGroup ? item.group : null
                        lastGroup = item.group
                        return (
                            <React.Fragment key={item.group + item.to}>
                                {header && <p className="cp-group">{header}</p>}
                                <button className={i === index ? "cp-item cp-item-on" : "cp-item"} onMouseEnter={() => setIndex(i)} onClick={() => go(item)}>
                                    {item.label}
                                </button>
                            </React.Fragment>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default function AppLayout({ title, crumbs, actions, children, wide, flush, noHead }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [me, setMe] = useState({ name: "", lastname: "", username: "", usage: null, user: null, ready: false })
    const [drawer, setDrawer] = useState(false)
    const [palette, setPalette] = useState(false)
    const [menu, setMenu] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setMe((old) => ({ ...old, name: res.name || "", lastname: res.lastname || "", username: res.username || "", userId: res.user_id, ready: true }))
            } else if (res.Error === true) {
                setMe((old) => ({ ...old, ready: true, offline: true }))
            } else {
                navigate("/auth/login")
            }
        })
        async function loadMe() {
            const data = await getMe()
            if (data.Message === true) {
                setMe((old) => ({ ...old, usage: data.usage, user: data.user }))
            }
        }
        loadMe()
    }, [navigate])

    useEffect(() => {
        setDrawer(false)
        setMenu(false)
    }, [location.pathname])

    useEffect(() => {
        function onKey(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                setPalette(true)
            }
            if (e.key === "Escape") {
                setPalette(false)
                setMenu(false)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    async function HandleLogout() {
        await Logout()
        navigate("/auth/login")
    }

    const usage = me.usage
    const isAdmin = usage && usage.unlimited
    let initial = "?"
    if (me.name) {
        initial = me.name.charAt(0).toUpperCase()
    }

    let planName = "Free"
    let usedPercent = 0
    if (usage) {
        planName = usage.unlimited ? "Admin" : usage.plan.plan_type
        if (!usage.unlimited && usage.limit > 0) {
            usedPercent = Math.min(100, (usage.used / usage.limit) * 100)
        }
    }

    return (
        <MeContext.Provider value={me}>
            <div className="ap">
                <Seo title={(title || "Dashboard") + " | Forkwise"} noindex />

                <aside className={drawer ? "ap-side ap-side-open" : "ap-side"}>
                    <div className="ap-side-top">
                        <Link to="/dashboard" className="fw-logo">
                            <img src={Logo} alt="" width="28" height="28" />
                            <span>Forkwise</span>
                        </Link>
                        <button className="fw-icon-btn ap-close" onClick={() => setDrawer(false)} aria-label="Close menu"><FaTimes /></button>
                    </div>

                    <button className="ap-search" onClick={() => setPalette(true)}>
                        <FaSearch /> <span>Search</span> <span className="fw-kbd">Ctrl K</span>
                    </button>

                    <nav className="ap-nav" aria-label="App">
                        <div className="ap-group">
                            {MAIN_LINKS.map((item) => <SideLink key={item.to} item={item} />)}
                        </div>
                        <div className="ap-group">
                            <p className="ap-group-title">Account</p>
                            {ACCOUNT_LINKS.map((item) => <SideLink key={item.to} item={item} />)}
                        </div>
                        <div className="ap-group">
                            <p className="ap-group-title">Help</p>
                            <Link to="/docs" className="ap-link"><FaBook /> <span>Documentation</span> <FaExternalLinkAlt className="ap-ext" /></Link>
                            <SideLink item={{ to: "/help", icon: FaLifeRing, label: "Help and support" }} />
                            {isAdmin && <SideLink item={{ to: "/admin", icon: FaShieldAlt, label: "Admin panel" }} />}
                        </div>
                    </nav>

                    <div className="ap-plan">
                        <div className="ap-plan-top">
                            <span className="fw-badge fw-badge-accent fw-badge-plain">{planName}</span>
                            {usage && !usage.unlimited && <span className="fw-muted fw-mono" style={{ fontSize: 12 }}>{usage.used}/{usage.limit} today</span>}
                        </div>
                        {usage && !usage.unlimited && (
                            <div className="ap-meter"><span style={{ width: usedPercent + "%" }}></span></div>
                        )}
                        {usage && !usage.unlimited && usage.plan.plan_type !== "Premium" && (
                            <Link to="/pricing" className="fw-btn fw-btn-ghost fw-btn-sm fw-btn-block"><FaArrowUp /> Upgrade plan</Link>
                        )}
                        {!usage && <div className="fw-skeleton" style={{ height: 30 }}></div>}
                    </div>
                </aside>

                {drawer && <div className="ap-scrim" onClick={() => setDrawer(false)}></div>}

                <div className="ap-body">
                    <header className="ap-top">
                        <button className="fw-icon-btn ap-burger" onClick={() => setDrawer(true)} aria-label="Open menu"><FaBars /></button>
                        <div className="ap-crumbs">
                            {crumbs ? crumbs.map((c, i) => (
                                <React.Fragment key={c.label}>
                                    {i > 0 && <span className="ap-crumb-sep">/</span>}
                                    {c.to ? <Link to={c.to}>{c.label}</Link> : <span className="ap-crumb-now">{c.label}</span>}
                                </React.Fragment>
                            )) : <span className="ap-crumb-now">{title}</span>}
                        </div>
                        <div className="ap-top-right">
                            <button className="fw-icon-btn ap-top-search" onClick={() => setPalette(true)} aria-label="Search"><FaSearch /></button>
                            {location.pathname !== "/chat" && (
                                <button className="fw-btn fw-btn-primary fw-btn-sm ap-top-new" onClick={() => navigate("/chat")}><FaPlus /> <span>New analysis</span></button>
                            )}
                            <div className="ap-user-wrap">
                                <button className="ap-user" onClick={() => setMenu(!menu)} aria-expanded={menu}>
                                    <span className="ap-avatar">{initial}</span>
                                    <span className="ap-user-name">{me.name}</span>
                                    <FaChevronDown className="ap-user-caret" />
                                </button>
                                {menu && (
                                    <div className="ap-menu">
                                        <div className="ap-menu-head">
                                            <b>{me.name} {me.lastname}</b>
                                            <span>@{me.username}</span>
                                        </div>
                                        <Link to="/settings"><FaCog /> Settings</Link>
                                        <Link to="/invoices"><FaReceipt /> Billing</Link>
                                        <Link to="/"><FaHome /> Forkwise website</Link>
                                        <button onClick={HandleLogout}><FaSignOutAlt /> Log out</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {me.offline && (
                        <div className="ap-offline">Could not reach the Forkwise server. Some data may be missing. Check the <Link to="/status">status page</Link>.</div>
                    )}

                    <main className={flush ? "ap-main ap-main-flush" : wide ? "ap-main ap-main-wide" : "ap-main"}>
                        {(title || actions) && !flush && !noHead && (
                            <div className="ap-page-head">
                                <h1 className="ap-title">{title}</h1>
                                {actions && <div className="ap-page-actions">{actions}</div>}
                            </div>
                        )}
                        {children}
                    </main>
                </div>

                {palette && <CommandPalette onClose={() => setPalette(false)} isAdmin={isAdmin} />}
            </div>
        </MeContext.Provider>
    )
}
