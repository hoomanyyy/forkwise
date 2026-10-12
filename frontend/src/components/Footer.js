import React from "react"
import { Link } from "react-router-dom"
import Logo from "../images/logo.svg"

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
                    <Link to="/register">Sign up</Link>
                </div>
                <div className="FooterColumn">
                    <p className="FooterTitle">Project</p>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/privacy">Privacy</Link>
                </div>
            </div>
            <div className="FooterBottom">
                <span>© 2026 Forkwise · A-ISPC 2026 project</span>
                <span>Powered by Cloudflare Workers AI, FastAPI and React</span>
            </div>
        </footer>
    )
}