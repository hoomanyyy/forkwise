import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { FaSyncAlt } from "react-icons/fa"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"
import { checkHealth, getPlans } from "../../api"

const MAX_CHECKS = 40

async function checkPlans() {
    const started = Date.now()
    const result = await getPlans()
    return { ok: result.Message === true, ms: Date.now() - started }
}

export default function Status() {
    const [api, setApi] = useState([])
    const [plans, setPlans] = useState([])
    const [checking, setChecking] = useState(false)
    const timer = useRef(null)

    async function runChecks() {
        setChecking(true)
        const a = await checkHealth()
        const p = await checkPlans()
        const time = new Date()
        setApi((old) => [...old, { ...a, time: time }].slice(-MAX_CHECKS))
        setPlans((old) => [...old, { ...p, time: time }].slice(-MAX_CHECKS))
        setChecking(false)
    }

    useEffect(() => {
        runChecks()
        timer.current = setInterval(runChecks, 30000)
        return () => clearInterval(timer.current)
    }, [])

    const lastApi = api.length > 0 ? api[api.length - 1] : null
    const lastPlans = plans.length > 0 ? plans[plans.length - 1] : null

    let state = "wait"
    let title = "Checking the systems..."
    let text = "Running the first check."
    if (lastApi && lastPlans) {
        if (lastApi.ok && lastPlans.ok) {
            state = "ok"
            title = "All systems working"
            text = "The website, the API and the database answered."
        } else {
            state = "bad"
            title = "Some systems are not answering"
            text = "We could not reach part of Forkwise from your browser. If this lasts, please contact us."
        }
    }

    const services = [
        { name: "Website", text: "This page loaded, so the website is up.", checks: [{ ok: true, ms: 0 }], always: true },
        { name: "Analysis API", text: "Health check of the server that runs analyses and the Assistant.", checks: api },
        { name: "Database", text: "Reading the plan list from the database.", checks: plans }
    ]

    return (
        <SiteLayout footerCta={false}>
            <Seo title="Forkwise System Status" description="Live check of the Forkwise website, API and database." path="/status" />
            <PageHero narrow eyebrow="Status" title="System status" lead="This page checks Forkwise live from your browser every 30 seconds while it is open." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow" style={{ display: "grid", gap: 16 }}>
                    <div className={"st-banner st-" + state}>
                        <span className="st-light"></span>
                        <div style={{ flex: 1 }}>
                            <h2>{title}</h2>
                            <p>{text}</p>
                        </div>
                        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={runChecks} disabled={checking}><FaSyncAlt /> {checking ? "Checking" : "Check now"}</button>
                    </div>

                    <div className="st-list">
                        {services.map((s) => {
                            const last = s.checks.length > 0 ? s.checks[s.checks.length - 1] : null
                            const bars = []
                            for (let i = 0; i < MAX_CHECKS; i++) {
                                const index = s.checks.length - MAX_CHECKS + i
                                bars.push(index >= 0 && !s.always ? s.checks[index] : null)
                            }
                            return (
                                <div className="st-row" key={s.name}>
                                    <div style={{ minWidth: 0 }}>
                                        <b style={{ color: "#fff", fontWeight: 500 }}>{s.name}</b>
                                        <p>{s.text}</p>
                                        {!s.always && (
                                            <div className="st-bars" aria-hidden="true">
                                                {bars.map((b, i) => (
                                                    <i key={i} className={b === null ? "st-bar-empty" : b.ok ? "" : "st-bar-bad"} style={{ height: b === null ? "100%" : Math.max(20, Math.min(100, 20 + b.ms / 20)) + "%" }}></i>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        {last === null ? (
                                            <span className="fw-badge">checking</span>
                                        ) : last.ok ? (
                                            <span className="fw-badge fw-badge-finished">working</span>
                                        ) : (
                                            <span className="fw-badge fw-badge-choice_dependent">not answering</span>
                                        )}
                                        {last && !s.always && <p className="fw-mono" style={{ marginTop: 6 }}>{last.ms} ms</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <p className="fw-muted" style={{ fontSize: 13 }}>
                        Bar height shows response time. Checks are made from your own browser, so a slow or blocked network on your side also shows here.
                        Need help? <Link to="/contact">Contact us</Link>.
                    </p>
                </div>
            </section>
        </SiteLayout>
    )
}
