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
                    <a href="mailto:support@forkwise.online"><FaEnvelope /> support@forkwise.online</a>
                    <a href="tel:+13473915729"><FaPhoneAlt /> +1 (347) 391-5729</a>
                </div>
            </div>
            <div className="FooterBottom">
                <span>© 2026 Forkwise · A-ISPC 2026 project</span>
                <span>Powered by Cloudflare Workers AI, FastAPI and React</span>
            </div>
        </footer>
    )
}