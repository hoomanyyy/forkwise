import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaDownload, FaUserCheck, FaHistory, FaMobileAlt, FaShieldAlt, FaApple, FaAndroid, FaBolt } from "react-icons/fa"
import SiteLayout, { PageHero } from "../components/site/SiteLayout"
import Seo from "../components/Seo"
import Logo from "../images/logo.svg"

const APK_URL = "/downloads/forkwise.apk"
const VERSION = "1.0.0"

const schema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Forkwise",
    "operatingSystem": "Android 6.0 or newer",
    "applicationCategory": "EducationalApplication",
    "softwareVersion": VERSION,
    "downloadUrl": "https://forkwiseai.com" + APK_URL,
    "url": "https://forkwiseai.com/download",
    "description": "Run a multiverse analysis on your phone. Many AI analysts study your data and Forkwise tells you how robust the answer is.",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
}

const STEPS = [
    { title: "Download the file", text: "Tap the download button on your Android phone. The file is called forkwise.apk." },
    { title: "Allow the install", text: "Open the file. Android may ask you to allow installs from your browser. Tap Settings, turn on \"Allow from this source\" and go back." },
    { title: "Log in", text: "Open Forkwise and log in with the same account you use on the website, or create a new one." }
]

export default function Download() {
    const [size, setSize] = useState("")
    const [ready, setReady] = useState(true)

    useEffect(() => {
        fetch(APK_URL, { method: "HEAD" })
            .then((res) => {
                const type = res.headers.get("content-type") || ""
                if (!res.ok || type.includes("text/html")) {
                    setReady(false)
                    return
                }
                const bytes = Number(res.headers.get("content-length"))
                if (bytes > 0) {
                    setSize((bytes / 1024 / 1024).toFixed(1) + " MB")
                }
            })
            .catch(() => {})
    }, [])

    return (
        <SiteLayout>
            <Seo
                title="Download the Forkwise Android App"
                description="Get Forkwise on your Android phone. Upload your data, let many AI analysts study it and see a clear verdict. Free, same account as the website."
                path="/download"
                schema={schema}
            />
            <PageHero eyebrow="Android app" title="Forkwise on your phone" lead="The same tool as the website, made for your phone. Start an analysis, follow your results and open your history anywhere.">
                {ready ? (
                    <a href={APK_URL} download className="fw-btn fw-btn-primary fw-btn-lg"><FaDownload /> Download for Android</a>
                ) : (
                    <span className="fw-badge fw-badge-waiting">The app file is being updated. Please check again soon.</span>
                )}
                <span className="fw-muted" style={{ alignSelf: "center", fontSize: 14 }}>Version {VERSION}{size !== "" ? " · " + size : ""} · Android 6.0 or newer · Free</span>
            </PageHero>

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="mk-split">
                        <div style={{ display: "grid", gap: 14 }}>
                            <div className="mk-grid-2">
                                <div className="mk-card"><span className="mk-card-icon"><FaUserCheck /></span><h3 className="mk-h3">One account</h3><p>Log in with your website account.</p></div>
                                <div className="mk-card"><span className="mk-card-icon mk-card-icon-cyan"><FaBolt /></span><h3 className="mk-h3">Free to start</h3><p>Create a free account, no card needed.</p></div>
                                <div className="mk-card"><span className="mk-card-icon mk-card-icon-green"><FaHistory /></span><h3 className="mk-h3">Your history</h3><p>See every past run and verdict.</p></div>
                                <div className="mk-card"><span className="mk-card-icon mk-card-icon-amber"><FaMobileAlt /></span><h3 className="mk-h3">Made for phones</h3><p>Simple steps and big buttons.</p></div>
                            </div>
                        </div>
                        <div className="dl-phone" aria-hidden="true">
                            <div className="dl-phone-bar"></div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 4px 8px" }}>
                                <img src={Logo} alt="" width="22" height="22" />
                                <b style={{ color: "#fff", fontSize: 13 }}>Forkwise</b>
                            </div>
                                                        <div className="dl-phone-card"><small>Run #39 · 10 analysts</small><p>Does coffee raise heart risk?</p><span className="fw-badge fw-badge-no_effect" style={{ justifySelf: "start" }}>no effect</span></div>
                            <div className="dl-phone-card"><small>Run #38 · 10 analysts</small><p>Do people in richer countries live longer?</p><span className="fw-badge fw-badge-robust" style={{ justifySelf: "start" }}>robust</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <h2 className="mk-h2" style={{ marginBottom: 28 }}>How to install</h2>
                    <div className="steps">
                        {STEPS.map((s, i) => (
                            <div className="step" key={s.title}>
                                <span className="step-num">0{i + 1}</span>
                                <h3 className="mk-h3">{s.title}</h3>
                                <p>{s.text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mk-grid-2" style={{ marginTop: 16 }}>
                        <div className="mk-card">
                            <span className="mk-card-icon mk-card-icon-amber"><FaShieldAlt /></span>
                            <h3 className="mk-h3">Why does Android show a warning?</h3>
                            <p>Forkwise is not on Google Play yet, so Android asks before it installs an app from a website. This is normal. Only download the app from the Forkwise website, never from another site.</p>
                        </div>
                        <div className="mk-card">
                            <span className="mk-card-icon"><FaApple /></span>
                            <h3 className="mk-h3">Have an iPhone?</h3>
                            <p>There is no iPhone app yet. The website works well on iPhone: open <Link to="/">forkwiseai.com</Link> in Safari, tap Share and then "Add to Home Screen" to keep it like an app.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <div className="mk-final">
                        <h2 className="mk-h2"><FaAndroid style={{ color: "var(--green)" }} /> Ready to try it?</h2>
                        <p>Free, no card, the same account on the phone and the website.</p>
                        {ready ? (
                            <a href={APK_URL} download className="fw-btn fw-btn-light fw-btn-lg">Download the app</a>
                        ) : (
                            <Link to="/register" className="fw-btn fw-btn-light fw-btn-lg">Use the website</Link>
                        )}
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
