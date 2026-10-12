import React, { useEffect, useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { FaBars, FaTimes } from "react-icons/fa"
import Logo from "../images/logo.svg"
import { sendAuthRequestWithWebsocket } from "../api"

export default function Navbar() {
    const navigate = useNavigate()
    const [loggedIn, setLoggedIn] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setLoggedIn(true)
            }
        })
    }, [])

    function linkClass({ isActive }) {
        return isActive ? "NavLink NavLinkOn" : "NavLink"
    }

    return (
        <nav className="SiteNav" aria-label="Main">
            <Link to="/" className="NavBrand">
                <img src={Logo} alt="Forkwise logo" className="NavLogo" width="36" height="36" />
                <span>Forkwise</span>
            </Link>

            <button className="NavMenuButton" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                {menuOpen ? <FaTimes /> : <FaBars />}
            </button>

            <div className={menuOpen ? "NavLinks NavLinksOpen" : "NavLinks"}>
                <NavLink to="/" end className={linkClass}>Home</NavLink>
                <NavLink to="/how-it-works" className={linkClass}>How it works</NavLink>
                <NavLink to="/about" className={linkClass}>About</NavLink>
                <NavLink to="/faq" className={linkClass}>FAQ</NavLink>
                <NavLink to="/contact" className={linkClass}>Contact</NavLink>
                {loggedIn ? (
                    <button className="btn NavPrimary" onClick={() => navigate("/dashboard")}>Dashboard</button>
                ) : (
                    <>
                        <NavLink to="/auth/login" className={linkClass}>Log in</NavLink>
                        <button className="btn NavPrimary" onClick={() => navigate("/register")}>Sign up</button>
                    </>
                )}
            </div>
        </nav>
    )
}