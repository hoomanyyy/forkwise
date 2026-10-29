import React from "react"
import {
    FiGlobe, FiBookOpen, FiHelpCircle, FiShield, FiMail, FiPhone, FiLogOut, FiChevronRight, FiZap, FiFileText,
    FiBook, FiType, FiActivity
} from "react-icons/fi"
import { TopBar, UsageRing } from "../components/Parts"
import { WEBSITE, APP_VERSION } from "../api"
import { openLink, tap } from "../native"
import "../styles/Profile.css"

const LEARN = [
    { icon: FiBook, label: "Documentation", sub: "How every step and chart works", url: WEBSITE + "/docs" },
    { icon: FiBookOpen, label: "What is a multiverse analysis?", sub: "A five minute guide", url: WEBSITE + "/learn/multiverse-analysis" },
    { icon: FiType, label: "Glossary", sub: "p value, controls, leakage and more", url: WEBSITE + "/glossary" },
    { icon: FiHelpCircle, label: "How it works", sub: "From your file to a verdict", url: WEBSITE + "/how-it-works" }
]

const ABOUT = [
    { icon: FiGlobe, label: "Website", url: WEBSITE },
    { icon: FiActivity, label: "System status", url: WEBSITE + "/status" },
    { icon: FiShield, label: "Privacy", url: WEBSITE + "/privacy" }
]

function LinkRow({ item }) {
    const Icon = item.icon
    return (
        <button className="AppListItem" onClick={() => { tap(); openLink(item.url) }}>
            <span className="AppListIcon"><Icon /></span>
            <span className="AppListText">
                {item.label}
                {item.sub && <small>{item.sub}</small>}
            </span>
            <FiChevronRight className="AppListArrow" />
        </button>
    )
}

export default function ProfilePage({ user, usage, onLogout, onPlans, onBilling }) {
    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "F"
    const plan = usage && usage.plan ? usage.plan : null

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
                    <span className="AppEyebrow">{usage ? (usage.unlimited ? "Admin" : plan.plan_type) + " plan" : "Plan"}</span>
                    <b>Daily analyses</b>
                    <p>
                        {usage && usage.unlimited
                            ? "Your account has no daily limit."
                            : usage
                                ? usage.left + " of " + usage.limit + " left today · up to " + plan.max_analysts + " analysts · " + plan.daily_chat_limit + " Assistant messages a day"
                                : "Loading..."}
                    </p>
                </div>
            </section>

            <div className="AppSectionTitle"><span>Account</span></div>
            <div className="AppList">
                <button className="AppListItem" onClick={() => { tap(); onPlans() }}>
                    <span className="AppListIcon"><FiZap /></span>
                    <span className="AppListText">Plans<small>More analysts, more runs, CSV export</small></span>
                    <FiChevronRight className="AppListArrow" />
                </button>
                <button className="AppListItem" onClick={() => { tap(); onBilling() }}>
                    <span className="AppListIcon"><FiFileText /></span>
                    <span className="AppListText">Billing<small>Your plan and invoices</small></span>
                    <FiChevronRight className="AppListArrow" />
                </button>
            </div>

            <div className="AppSectionTitle"><span>Learn</span></div>
            <div className="AppList">
                {LEARN.map((l) => <LinkRow key={l.label} item={l} />)}
            </div>

            <div className="AppSectionTitle"><span>Support</span></div>
            <div className="AppList">
                <a className="AppListItem" href="mailto:info@forkwiseai.com">
                    <span className="AppListIcon"><FiMail /></span>
                    <span className="AppListText">info@forkwiseai.com</span>
                    <FiChevronRight className="AppListArrow" />
                </a>
                <a className="AppListItem" href="tel:+13473915729">
                    <span className="AppListIcon"><FiPhone /></span>
                    <span className="AppListText">+1 (347) 391-5729</span>
                    <FiChevronRight className="AppListArrow" />
                </a>
                {ABOUT.map((l) => <LinkRow key={l.label} item={l} />)}
            </div>

            <button className="ProfLogout" onClick={() => { tap(); onLogout() }}>
                <FiLogOut /> Log out
            </button>

            <p className="ProfVersion">Forkwise for Android · version {APP_VERSION}</p>
        </div>
    )
}
