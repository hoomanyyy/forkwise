import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaSignOutAlt, FaKey } from "react-icons/fa"
import AppLayout, { useMe } from "../../components/app/AppLayout"
import { Logout } from "../../api"

export function readSetting(name, fallback) {
    try {
        const value = localStorage.getItem("fw-" + name)
        if (value === null) {
            return fallback
        }
        return value
    } catch (e) {
        return fallback
    }
}

function saveSetting(name, value) {
    try {
        localStorage.setItem("fw-" + name, value)
    } catch (e) {
        // storage is not available, the setting only lasts for this page
    }
}

function SettingsBody() {
    const me = useMe()
    const navigate = useNavigate()
    const [analysts, setAnalysts] = useState(readSetting("default-analysts", "10"))
    const [tips, setTips] = useState(readSetting("show-tips", "1") === "1")
    const [saved, setSaved] = useState("")

    function changeAnalysts(value) {
        setAnalysts(value)
        saveSetting("default-analysts", value)
        setSaved("Default number of analysts saved")
        setTimeout(() => setSaved(""), 1800)
    }

    function changeTips() {
        const next = !tips
        setTips(next)
        saveSetting("show-tips", next ? "1" : "0")
        setSaved(next ? "Tips turned on" : "Tips turned off")
        setTimeout(() => setSaved(""), 1800)
    }

    async function HandleLogout() {
        await Logout()
        navigate("/auth/login")
    }

    const usage = me.usage
    return (
        <div className="se">
            <nav className="se-nav" aria-label="Settings sections">
                <a href="#profile">Profile</a>
                <a href="#security">Security</a>
                <a href="#preferences">Preferences</a>
                <a href="#plan">Plan</a>
                <a href="#data">Your data</a>
            </nav>

            <div className="se-body">
                <section className="ax-card" id="profile">
                    <div className="ax-card-head">
                        <div>
                            <h2>Profile</h2>
                            <p>The details on your Forkwise account</p>
                        </div>
                    </div>
                    <div style={{ padding: 22, display: "grid", gap: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <span className="ap-avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{me.name ? me.name.charAt(0).toUpperCase() : "?"}</span>
                            <div>
                                <b style={{ color: "#fff", fontSize: 16 }}>{me.name} {me.lastname}</b>
                                <p className="fw-muted" style={{ fontSize: 13 }}>@{me.username}</p>
                            </div>
                        </div>
                        <div className="wz-grid-2">
                            <label className="fw-field">
                                <span className="fw-label">First name</span>
                                <input className="fw-input" value={me.name || ""} readOnly />
                            </label>
                            <label className="fw-field">
                                <span className="fw-label">Last name</span>
                                <input className="fw-input" value={me.lastname || ""} readOnly />
                            </label>
                        </div>
                        <label className="fw-field">
                            <span className="fw-label">Username</span>
                            <input className="fw-input" value={me.username || ""} readOnly />
                        </label>
                        <p className="fw-hint">To change your name or username, <Link to="/contact">contact us</Link>.</p>
                    </div>
                </section>

                <section className="ax-card" id="security">
                    <div className="ax-card-head">
                        <div>
                            <h2>Security</h2>
                            <p>Password and sign-in</p>
                        </div>
                    </div>
                    <div className="se-row" style={{ borderTop: "none" }}>
                        <div>
                            <b>Password</b>
                            <p>We send an 8 digit code to your email, then you choose a new password.</p>
                        </div>
                        <Link to="/forgot-password" className="fw-btn fw-btn-ghost fw-btn-sm"><FaKey /> Change password</Link>
                    </div>
                    <div className="se-row">
                        <div>
                            <b>Sign out</b>
                            <p>End your session on this browser.</p>
                        </div>
                        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={HandleLogout}><FaSignOutAlt /> Log out</button>
                    </div>
                </section>

                <section className="ax-card" id="preferences">
                    <div className="ax-card-head">
                        <div>
                            <h2>Preferences</h2>
                            <p>Saved in this browser</p>
                        </div>
                        {saved !== "" && <span className="fw-badge fw-badge-finished">{saved}</span>}
                    </div>
                    <div className="se-row" style={{ borderTop: "none" }}>
                        <div>
                            <b>Default number of analysts</b>
                            <p>Used when you open New analysis.</p>
                        </div>
                        <select className="fw-select" style={{ width: 140 }} value={analysts} onChange={(e) => changeAnalysts(e.target.value)} aria-label="Default number of analysts">
                            <option value="10">10 analysts</option>
                            <option value="25">25 analysts</option>
                            <option value="50">50 analysts</option>
                            <option value="100">100 analysts</option>
                        </select>
                    </div>
                    <div className="se-row">
                        <div>
                            <b>Show tips</b>
                            <p>Short tips next to the New analysis form.</p>
                        </div>
                        <button className={tips ? "se-toggle se-toggle-on" : "se-toggle"} onClick={changeTips} aria-pressed={tips} aria-label="Show tips"></button>
                    </div>
                </section>

                <section className="ax-card" id="plan">
                    <div className="ax-card-head">
                        <div>
                            <h2>Plan</h2>
                            <p>{usage ? (usage.unlimited ? "Admin account" : usage.plan.plan_type + " plan") : "Loading"}</p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Link to="/usage" className="fw-btn fw-btn-ghost fw-btn-sm">Usage</Link>
                            <Link to="/invoices" className="fw-btn fw-btn-ghost fw-btn-sm">Billing</Link>
                        </div>
                    </div>
                </section>

                <section className="ax-card" id="data">
                    <div className="ax-card-head">
                        <div>
                            <h2>Your data</h2>
                            <p>How your files and results are handled</p>
                        </div>
                    </div>
                    <div className="se-row" style={{ borderTop: "none" }}>
                        <div>
                            <b>What the AI can see</b>
                            <p>The AI analysts only get a summary of your columns. Python works with the full file on our server.</p>
                        </div>
                        <Link to="/security" className="fw-btn fw-btn-ghost fw-btn-sm">Learn more</Link>
                    </div>
                    <div className="se-row">
                        <div>
                            <b>Delete your account</b>
                            <p>Write to us from your account email and we will delete your account and all of its runs.</p>
                        </div>
                        <a href="mailto:info@forkwiseai.com?subject=Delete%20my%20Forkwise%20account" className="fw-btn fw-btn-danger fw-btn-sm">Request deletion</a>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default function Settings() {
    return (
        <AppLayout title="Settings" crumbs={[{ label: "Settings" }]}>
            <SettingsBody />
        </AppLayout>
    )
}
