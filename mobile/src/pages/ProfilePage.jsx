import React from "react"
import { FiGlobe, FiBookOpen, FiHelpCircle, FiShield, FiMail, FiPhone, FiLogOut, FiChevronRight } from "react-icons/fi"
import { TopBar, UsageRing } from "../components/Parts"
import { WEBSITE } from "../api"
import { openLink, tap } from "../native"
import "../styles/Profile.css"

const LINKS = [
    { icon: FiBookOpen, label: "What is a multiverse analysis?", url: WEBSITE + "/learn/multiverse-analysis" },
    { icon: FiHelpCircle, label: "How it works", url: WEBSITE + "/how-it-works" },
    { icon: FiGlobe, label: "Website", url: WEBSITE },
    { icon: FiShield, label: "Privacy", url: WEBSITE + "/privacy" },
]

export default function ProfilePage({ user, usage, onLogout }) {
    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "F"

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <TopBar title="Profile" />

            <section className="ProfCard">
                <div className="ProfAvatar">{initial}</div>
                <h2 className="ProfName">{user ? (user.name || "") + " " + (user.lastname || "") : ""}</h2>
                <p className="ProfUser">@{user ? user.username : ""}</p>
            </section>

            <section className="ProfUsage">
                <UsageRing usage={usage} size={72} />
                <div>
                    <b>Daily analyses</b>
                    <p>
                        {usage && usage.unlimited
                            ? "Your account has no daily limit."
                            : usage
                                ? "You can run " + usage.limit + " analyses every day. " + usage.left + " left today."
                                : "Loading..."}
                    </p>
                </div>
            </section>

            <div className="AppSectionTitle"><span>Learn</span></div>
            <div className="ProfList">
                {LINKS.map((l) => {
                    const Icon = l.icon
                    return (
                        <button key={l.label} className="ProfItem" onClick={() => { tap(); openLink(l.url) }}>
                            <span className="ProfIcon"><Icon /></span>
                            <span className="ProfText">{l.label}</span>
                            <FiChevronRight className="ProfArrow" />
                        </button>
                    )
                })}
            </div>

            <div className="AppSectionTitle"><span>Support</span></div>
            <div className="ProfList">
                <a className="ProfItem" href="mailto:support@forkwise.online">
                    <span className="ProfIcon"><FiMail /></span>
                    <span className="ProfText">support@forkwise.online</span>
                    <FiChevronRight className="ProfArrow" />
                </a>
                <a className="ProfItem" href="tel:+13473915729">
                    <span className="ProfIcon"><FiPhone /></span>
                    <span className="ProfText">+1 (347) 391-5729</span>
                    <FiChevronRight className="ProfArrow" />
                </a>
            </div>

            <button className="ProfLogout" onClick={() => { tap(); onLogout() }}>
                <FiLogOut /> Log out
            </button>

            <p className="ProfVersion">Forkwise for Android · version 1.0.0 · A-ISPC 2026</p>
        </div>
    )
}
