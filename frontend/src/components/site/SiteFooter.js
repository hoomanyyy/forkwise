import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaEnvelope, FaPhone, FaXTwitter, FaInstagram, FaTiktok } from "react-icons/fa6"
import Logo from "../../images/logo.svg"
import { MENUS } from "./SiteNav"
import { checkHealth } from "../../api"

export default function SiteFooter({ cta = true }) {
    const [online, setOnline] = useState(null)

    useEffect(() => {
        async function check() {
            const result = await checkHealth()
            setOnline(result.ok)
        }
        check()
    }, [])

    let statusText = "Checking status"
    let statusClass = "sf-status"
    if (online === true) {
        statusText = "All systems working"
        statusClass = "sf-status sf-status-ok"
    }
    if (online === false) {
        statusText = "API not reachable"
        statusClass = "sf-status sf-status-bad"
    }

    return (
        <footer className="sf">
            {cta && (
            <div className="sf-cta">
                <div>
                    <h2>Find out if your finding holds up.</h2>
                    <p>Free plan. No card. Your first verdict in about a minute.</p>
                </div>
                <div className="sf-cta-buttons">
                    <Link to="/register" className="fw-btn fw-btn-light fw-btn-lg">Start free</Link>
                    <Link to="/product" className="fw-btn fw-btn-ghost fw-btn-lg">Tour the platform</Link>
                </div>
            </div>
            )}

            <div className="sf-main">
                <div className="sf-brand">
                    <Link to="/" className="fw-logo">
                        <img src={Logo} alt="" width="30" height="30" />
                        <span>Forkwise</span>
                    </Link>
                    <p>Many AI analysts, one question, one honest answer about how strong your data finding really is.</p>
                    <div className="sf-contact">
                        <a href="mailto:info@forkwiseai.com"><FaEnvelope /> info@forkwiseai.com</a>
                        <a href="tel:+13473915729"><FaPhone /> +1 (347) 391-5729</a>
                    </div>
                    <div className="sf-social">
                        <a href="https://x.com/forkwiseai" target="_blank" rel="noopener noreferrer" aria-label="Forkwise on X"><FaXTwitter /></a>
                        <a href="https://www.instagram.com/forkwiseai/" target="_blank" rel="noopener noreferrer" aria-label="Forkwise on Instagram"><FaInstagram /></a>
                        <a href="https://www.tiktok.com/@forkwise.ai.platfo" target="_blank" rel="noopener noreferrer" aria-label="Forkwise on TikTok"><FaTiktok /></a>
                    </div>
                </div>

                {MENUS.map((menu) => (
                    <div key={menu.name} className="sf-col">
                        <p className="sf-title">{menu.name}</p>
                        {menu.items.map((item) => (
                            <Link key={item.to} to={item.to}>{item.title}</Link>
                        ))}
                        {menu.name === "Product" && <Link to="/pricing">Pricing</Link>}
                    </div>
                ))}
            </div>

            <div className="sf-bottom">
                <span>© 2026 Forkwise · Built for A-ISPC 2026</span>
                <Link to="/status" className={statusClass}><i></i>{statusText}</Link>
                <span>Runs on Cloudflare Workers AI, FastAPI and React</span>
            </div>
        </footer>
    )
}
