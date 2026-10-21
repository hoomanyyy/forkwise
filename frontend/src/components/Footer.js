import React from "react"
import { Link } from "react-router-dom"
import Logo from "../images/logo.svg"
import { FaEnvelope, FaPhoneAlt } from "react-icons/fa"

export default function Footer() {
    return (
        <footer className="FooterBox">
            <div className="FooterTop">
                <div className="FooterBrand">
                    <Link to="/" className="NavBrand">
                        <img src={Logo} alt="Forkwise logo" className="NavLogo" width="36" height="36" />
                        <span>Forkwise</span>
                    </Link>
                    <p>Many AI analysts, one question. See how strong your answer really is.</p>
                </div>
                <div className="FooterColumn">
                    <p className="FooterTitle">Product</p>
                    <Link to="/how-it-works">How it works</Link>
                    <Link to="/faq">FAQ</Link>
                    <Link to="/download">Android app</Link>
                    <Link to="/register">Sign up</Link>
                </div>
                <div className="FooterColumn">
                    <p className="FooterTitle">Learn</p>
                    <Link to="/learn/multiverse-analysis">Multiverse analysis</Link>
                    <Link to="/learn/specification-curve">Specification curve</Link>
                    <Link to="/examples/coffee-and-heart-risk">Coffee example</Link>
                </div>
                <div className="FooterColumn">
                    <p className="FooterTitle">Project</p>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/privacy">Privacy</Link>
                </div>
                <div className="FooterColumn FooterContact">
                    <p className="FooterTitle">Contact</p>
                    <a href="mailto:info@forkwiseai.com"><FaEnvelope /> info@forkwiseai.com</a>
                    <a href="tel:+13473915729"><FaPhoneAlt /> +1 (347) 391-5729</a>
                </div>
            </div>
<div
    className="FooterBadge"
    style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 20px",
        width: "100%",
        boxSizing: "border-box",
    }}
>
    <a
        href="https://tools.cafe"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Featured on tools.cafe"
        style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            textDecoration: "none",
            transition: "opacity 0.2s ease",
        }}
    >
        <img
            src="https://tools.cafe/b/light.svg"
            alt="Featured on tools.cafe"
            width="192"
            height="60"
            loading="lazy"
            style={{
                display: "block",
                width: "192px",
                maxWidth: "100%",
                height: "auto",
            }}
        />
    </a>
</div>
            <div className="FooterBottom">
                <span>© 2026 Forkwise · A-ISPC 2026 project</span>
                <span>Powered by Cloudflare Workers AI, FastAPI and React</span>
            </div>
        </footer>
    )
}
