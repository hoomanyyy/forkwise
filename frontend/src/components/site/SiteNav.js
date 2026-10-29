import React, { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
    FaBars, FaTimes, FaChevronDown, FaLayerGroup, FaComments, FaChartLine, FaCogs, FaAndroid, FaHistory,
    FaGraduationCap, FaFlask, FaNewspaper, FaBriefcase, FaThLarge, FaBook, FaLightbulb, FaSpellCheck,
    FaUniversity, FaQuestionCircle, FaSignal, FaInfoCircle, FaShieldAlt, FaEnvelope, FaUserSecret, FaBalanceScale
} from "react-icons/fa"
import Logo from "../../images/logo.svg"
import { sendAuthRequestWithWebsocket } from "../../api"

export const MENUS = [
    {
        name: "Product",
        items: [
            { to: "/product", icon: FaLayerGroup, title: "Platform overview", text: "Everything Forkwise does, in one page" },
            { to: "/how-it-works", icon: FaCogs, title: "How it works", text: "From your file to a verdict in six steps" },
            { to: "/product/results", icon: FaChartLine, title: "Results and charts", text: "Specification curve, fits and analyst choices" },
            { to: "/product/assistant", icon: FaComments, title: "Forkwise Assistant", text: "Chat with any analysis you ran" },
            { to: "/download", icon: FaAndroid, title: "Android app", text: "Run and read analyses on your phone" },
            { to: "/changelog", icon: FaHistory, title: "Changelog", text: "What we shipped, week by week" }
        ]
    },
    {
        name: "Solutions",
        items: [
            { to: "/solutions/students", icon: FaGraduationCap, title: "Students", text: "Science fairs, theses and class projects" },
            { to: "/solutions/researchers", icon: FaFlask, title: "Researchers", text: "Robustness checks before you submit" },
            { to: "/solutions/journalists", icon: FaNewspaper, title: "Journalists", text: "Check a data claim before you publish it" },
            { to: "/solutions/business", icon: FaBriefcase, title: "Business analysts", text: "Know if a KPI driver is real" },
            { to: "/use-cases", icon: FaThLarge, title: "All use cases", text: "Real questions people test with Forkwise" },
            { to: "/compare", icon: FaBalanceScale, title: "Forkwise vs one chatbot", text: "Why one AI answer is not enough" }
        ]
    },
    {
        name: "Resources",
        items: [
            { to: "/docs", icon: FaBook, title: "Documentation", text: "Guides for every step of a run" },
            { to: "/learn", icon: FaLightbulb, title: "Learn", text: "Multiverse analysis, explained simply" },
            { to: "/glossary", icon: FaSpellCheck, title: "Glossary", text: "p value, controls, leakage and more" },
            { to: "/research", icon: FaUniversity, title: "Research", text: "The studies behind the method" },
            { to: "/faq", icon: FaQuestionCircle, title: "FAQ", text: "Short answers to common questions" },
            { to: "/status", icon: FaSignal, title: "System status", text: "Live check of the Forkwise API" }
        ]
    },
    {
        name: "Company",
        items: [
            { to: "/about", icon: FaInfoCircle, title: "About", text: "Why we built Forkwise" },
            { to: "/security", icon: FaShieldAlt, title: "Security and data", text: "What the AI can and cannot see" },
            { to: "/contact", icon: FaEnvelope, title: "Contact", text: "Questions, bugs and feedback" },
            { to: "/privacy", icon: FaUserSecret, title: "Privacy", text: "How we handle your information" }
        ]
    }
]

export default function SiteNav() {
    const navigate = useNavigate()
    const location = useLocation()
    const [loggedIn, setLoggedIn] = useState(false)
    const [openMenu, setOpenMenu] = useState("")
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setLoggedIn(true)
            }
        })
    }, [])

    useEffect(() => {
        setOpenMenu("")
        setMobileOpen(false)
    }, [location.pathname])

    useEffect(() => {
        function onScroll() {
            setScrolled(window.scrollY > 8)
        }
        onScroll()
        window.addEventListener("scroll", onScroll)
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") {
                setOpenMenu("")
                setMobileOpen(false)
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [])

    function toggleMenu(name) {
        if (openMenu === name) {
            setOpenMenu("")
        } else {
            setOpenMenu(name)
        }
    }

    return (
        <header className={scrolled ? "sn sn-scrolled" : "sn"} onMouseLeave={() => setOpenMenu("")}>
            <div className="sn-inner">
                <Link to="/" className="fw-logo" aria-label="Forkwise home">
                    <img src={Logo} alt="" width="30" height="30" />
                    <span>Forkwise</span>
                </Link>

                <nav className="sn-links" aria-label="Main">
                    {MENUS.map((menu) => (
                        <div key={menu.name} className="sn-item" onMouseEnter={() => setOpenMenu(menu.name)}>
                            <button
                                className={openMenu === menu.name ? "sn-link sn-link-on" : "sn-link"}
                                onClick={() => toggleMenu(menu.name)}
                                aria-expanded={openMenu === menu.name}
                            >
                                {menu.name} <FaChevronDown className="sn-caret" />
                            </button>
                            {openMenu === menu.name && (
                                <div className="sn-panel">
                                    <div className={menu.items.length > 4 ? "sn-panel-grid" : "sn-panel-grid sn-panel-grid-1"}>
                                        {menu.items.map((item) => (
                                            <Link key={item.to} to={item.to} className="sn-panel-link">
                                                <span className="sn-panel-icon"><item.icon /></span>
                                                <span>
                                                    <b>{item.title}</b>
                                                    <small>{item.text}</small>
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <Link to="/pricing" className="sn-link" onMouseEnter={() => setOpenMenu("")}>Pricing</Link>
                    <Link to="/docs" className="sn-link" onMouseEnter={() => setOpenMenu("")}>Docs</Link>
                </nav>

                <div className="sn-actions">
                    {loggedIn ? (
                        <button className="fw-btn fw-btn-primary fw-btn-sm" onClick={() => navigate("/dashboard")}>Open dashboard</button>
                    ) : (
                        <>
                            <Link to="/auth/login" className="fw-btn fw-btn-quiet fw-btn-sm">Log in</Link>
                            <button className="fw-btn fw-btn-light fw-btn-sm" onClick={() => navigate("/register")}>Start free</button>
                        </>
                    )}
                </div>

                <button className="sn-burger fw-icon-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu" aria-expanded={mobileOpen}>
                    {mobileOpen ? <FaTimes /> : <FaBars />}
                </button>
            </div>

            {mobileOpen && (
                <div className="sn-mobile">
                    {MENUS.map((menu) => (
                        <div key={menu.name} className="sn-mobile-group">
                            <p className="fw-eyebrow">{menu.name}</p>
                            {menu.items.map((item) => (
                                <Link key={item.to} to={item.to} className="sn-mobile-link">
                                    <item.icon /> {item.title}
                                </Link>
                            ))}
                        </div>
                    ))}
                    <div className="sn-mobile-group">
                        <Link to="/pricing" className="sn-mobile-link">Pricing</Link>
                        <Link to="/docs" className="sn-mobile-link">Docs</Link>
                    </div>
                    <div className="sn-mobile-actions">
                        {loggedIn ? (
                            <button className="fw-btn fw-btn-primary fw-btn-block" onClick={() => navigate("/dashboard")}>Open dashboard</button>
                        ) : (
                            <>
                                <Link to="/auth/login" className="fw-btn fw-btn-ghost fw-btn-block">Log in</Link>
                                <button className="fw-btn fw-btn-primary fw-btn-block" onClick={() => navigate("/register")}>Start free</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
