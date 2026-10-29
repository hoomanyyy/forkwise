import React from "react"
import { FiPlus, FiCoffee, FiArrowRight, FiBarChart2, FiMessageCircle, FiBookOpen, FiZap } from "react-icons/fi"
import { RunRow, UsageRing } from "../components/Parts"
import { WEBSITE } from "../api"
import { tap, openLink } from "../native"
import "../styles/Home.css"

function greeting() {
    const hour = new Date().getHours()
    if (hour < 12) {
        return "Good morning"
    }
    if (hour < 18) {
        return "Good afternoon"
    }
    return "Good evening"
}

function percent(part, total) {
    if (total === 0) {
        return 0
    }
    return (part / total) * 100
}

export default function HomePage({ user, usage, runs, loading, onNew, onExample, onOpenRun, onSeeAll, onProfile, onAssistant, onPlans }) {
    const recent = runs.slice(0, 4)
    const robust = runs.filter((r) => r.verdict === "robust").length
    const fragile = runs.filter((r) => r.verdict === "fragile").length
    const choice = runs.filter((r) => r.verdict === "choice_dependent").length
    const none = runs.filter((r) => r.verdict === "no_effect").length
    const finished = robust + fragile + choice + none
    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "F"
    const canUpgrade = usage && !usage.unlimited && usage.plan && usage.plan.plan_type !== "Premium"

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <header className="HomeHeader">
                <div>
                    <p className="HomeHello">{greeting()}</p>
                    <h1 className="HomeName">{user && user.name ? user.name : "Welcome"}</h1>
                </div>
                <button className="HomeAvatar" onClick={() => { tap(); onProfile() }} aria-label="Profile">{initial}</button>
            </header>

            <section className="HomeUsage">
                <UsageRing usage={usage} />
                <div className="HomeUsageText">
                    <p className="AppEyebrow">{usage ? (usage.unlimited ? "Admin" : usage.plan.plan_type) + " plan" : "Your plan"}</p>
                    <p className="HomeUsageTitle">Analyses today</p>
                    {usage && usage.unlimited ? (
                        <p className="HomeUsageSub">No daily limit.</p>
                    ) : (
                        <p className="HomeUsageSub">{usage ? usage.used + " of " + usage.limit + " used. Resets every day." : "Loading..."}</p>
                    )}
                    {canUpgrade && (
                        <button className="HomeUpgrade" onClick={() => { tap(); onPlans() }}><FiZap /> Upgrade</button>
                    )}
                </div>
            </section>

            <button className="HomeCta" onClick={() => { tap(); onNew() }}>
                <span className="HomeCtaIcon"><FiPlus /></span>
                <span className="HomeCtaText">
                    <b>New analysis</b>
                    <small>Upload a file and ask one question</small>
                </span>
                <FiArrowRight />
            </button>

            <div className="HomeQuick">
                <button onClick={() => { tap(); onExample() }}>
                    <FiCoffee />
                    <b>Coffee example</b>
                    <small>A hidden-variable trap</small>
                </button>
                <button onClick={() => { tap(); onAssistant() }}>
                    <FiMessageCircle />
                    <b>Assistant</b>
                    <small>Chat about a run</small>
                </button>
                <button onClick={() => { tap(); openLink(WEBSITE + "/docs") }}>
                    <FiBookOpen />
                    <b>Docs</b>
                    <small>How every chart works</small>
                </button>
            </div>

            {finished > 0 && (
                <section className="AppCard HomeMix">
                    <div className="HomeMixTop">
                        <b>How strong are your findings?</b>
                        <span>{finished} finished</span>
                    </div>
                    <div className="HomeMixBar">
                        <span style={{ width: percent(robust, finished) + "%", background: "#34d399" }}></span>
                        <span style={{ width: percent(fragile, finished) + "%", background: "#fbbf24" }}></span>
                        <span style={{ width: percent(choice, finished) + "%", background: "#f87171" }}></span>
                        <span style={{ width: percent(none, finished) + "%", background: "#c084fc" }}></span>
                    </div>
                    <div className="HomeMixLegend">
                        <span><i style={{ background: "#34d399" }}></i>Robust {robust}</span>
                        <span><i style={{ background: "#fbbf24" }}></i>Fragile {fragile}</span>
                        <span><i style={{ background: "#f87171" }}></i>Choice dep. {choice}</span>
                        <span><i style={{ background: "#c084fc" }}></i>No effect {none}</span>
                    </div>
                </section>
            )}

            <div className="AppSectionTitle">
                <span>Recent analyses</span>
                {runs.length > 4 && <button onClick={onSeeAll}>See all</button>}
            </div>

            {loading && runs.length === 0 && (
                <>
                    <div className="AppSkeleton" style={{ height: 78 }}></div>
                    <div className="AppSkeleton" style={{ height: 78 }}></div>
                </>
            )}

            {!loading && runs.length === 0 && (
                <div className="AppEmpty">
                    <FiBarChart2 />
                    <p>No analyses yet. Start with the coffee example to see how it works.</p>
                </div>
            )}

            {recent.map((run) => (
                <RunRow key={run.id} run={run} onOpen={onOpenRun} />
            ))}
        </div>
    )
}
