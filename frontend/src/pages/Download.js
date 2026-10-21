import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { Link } from "react-router-dom"
import { FaAndroid, FaApple, FaDownload, FaShieldAlt, FaUserCheck, FaHistory, FaBolt, FaMobileAlt } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
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
        <div className="SitePage">
            <Seo
                title="Download the Forkwise Android App"
                description="Get Forkwise on your Android phone. Upload your data, let many AI analysts study it and see a clear verdict. Free, same account as the website."
                path="/download"
                schema={schema}
            />
            <Navbar />

            <main className="PageBody PageNarrow">
                <div className="PageHead">
                    <p className="SectionTag">Android app</p>
                    <h1 className="PageTitle">Forkwise on your phone</h1>
                    <p className="PageLead">The same tool as the website, made for your phone. Start an analysis, follow your results and open your history anywhere.</p>
                </div>

                <section className="DownloadCard">
                    <img src={Logo} alt="Forkwise app icon" className="DownloadIcon" width="88" height="88" />
                    <div className="DownloadInfo">
                        <h2>Forkwise for Android</h2>
                        <p>Version {VERSION}{size !== "" ? " · " + size : ""} · Android 6.0 or newer · Free</p>
                        {ready ? (
                            <a href={APK_URL} download className="btn MainButton ApkButton">
                                <FaDownload /> Download for Android
                            </a>
                        ) : (
                            <span className="DownloadSoon">The app file is being updated. Please check again soon.</span>
                        )}
                    </div>
                    <div className="DownloadQr">
                        <img src="/downloads/qr.svg" alt="QR code for forkwise.online/download" width="120" height="120" />
                        <span>On a computer? Scan this with your phone.</span>
                    </div>
                </section>

                <div className="DownloadFeatures">
                    <div><FaUserCheck /><b>One account</b><span>Log in with your website account.</span></div>
                    <div><FaBolt /><b>5 analyses a day</b><span>Free for every user.</span></div>
                    <div><FaHistory /><b>Your history</b><span>See every past run and verdict.</span></div>
                    <div><FaMobileAlt /><b>Made for phones</b><span>Simple steps and big buttons.</span></div>
                </div>

                <h2 className="DownloadTitle">How to install</h2>
                <div className="MethodList">
                    {STEPS.map((s, i) => (
                        <div className="MethodStep" key={s.title}>
                            <div className="MethodIcon">{i + 1}</div>
                            <div className="MethodText">
                                <h2>{s.title}</h2>
                                <p>{s.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <section className="PrivacyCard DownloadNote">
                    <h2><FaShieldAlt /> Why does Android show a warning?</h2>
                    <p>
                        Forkwise is not on Google Play yet, so Android asks before it installs an app from a website.
                        This is normal. Only download the app from forkwise.online, never from another site.
                    </p>
                </section>

                <section className="PrivacyCard">
                    <h2><FaApple /> Have an iPhone?</h2>
                    <p>
                        There is no iPhone app yet. The website works well on iPhone, so open <Link to="/">forkwise.online</Link> in
                        Safari. You can tap Share and then "Add to Home Screen" to keep it like an app.
                    </p>
                </section>

                <section className="PageCall">
                    <h2><FaAndroid /> Ready to try it?</h2>
                    <p>Free, no card, the same account on the phone and the website.</p>
                    {ready ? (
                        <a href={APK_URL} download className="btn MainButton">Download the app</a>
                    ) : (
                        <Link to="/register" className="btn MainButton">Use the website</Link>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    )
}
