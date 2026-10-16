import React from "react"
import { FiPlus, FiCoffee, FiArrowRight, FiBarChart2 } from "react-icons/fi"
import { RunRow, UsageRing } from "../components/Parts"
import { tap } from "../native"
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

export default function HomePage({ user, usage, runs, loading, onNew, onExample, onOpenRun, onSeeAll, onProfile }) {
    const recent = runs.slice(0, 3)
    const done = runs.filter((r) => r.status === "complete").length
    const robust = runs.filter((r) => r.verdict === "robust").length
    const initial = user && user.name ? user.name.charAt(0).toUpperCase() : "F"

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <header className="HomeHeader">
                <div>
                    <p className="HomeHello">{greeting()}</p>
                    <h1 className="HomeName">{user && user.name ? user.name : "Welcome"}</h1>
                </div>
                <button className="HomeAvatar" onClick={() => { tap(); onProfile() }}>{initial}</button>
            </header>

            <section className="HomeUsage">
                <UsageRing usage={usage} />
                <div className="HomeUsageText">
                    <p className="HomeUsageTitle">Analyses today</p>
                    {usage && usage.unlimited ? (
                        <p className="HomeUsageSub">Admin account, no daily limit.</p>
                    ) : (
                        <p className="HomeUsageSub">
                            {usage ? usage.used + " of " + usage.limit + " used." : "Loading..."} The limit resets every day.
                        </p>
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

            <button className="HomeExample" onClick={() => { tap(); onExample() }}>
                <span className="HomeExampleIcon"><FiCoffee /></span>
                <span className="HomeCtaText">
                    <b>Try the coffee example</b>
                    <small>Does coffee raise heart risk? A hidden trap.</small>
                </span>
            </button>

            <div className="HomeStats">
                <div className="HomeStat">
                    <b>{runs.length}</b>
                    <span>Total runs</span>
                </div>
                <div className="HomeStat">
                    <b>{done}</b>
                    <span>Finished</span>
                </div>
                <div className="HomeStat">
                    <b>{robust}</b>
                    <span>Robust</span>
                </div>
            </div>

            <div className="AppSectionTitle">
                <span>Recent analyses</span>
                {runs.length > 3 && <button onClick={onSeeAll}>See all</button>}
            </div>

            {loading && runs.length === 0 && <div className="HomeSkeleton"></div>}

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
