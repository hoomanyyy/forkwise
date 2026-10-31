import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    FaPaperclip, FaArrowUp, FaGithub, FaTimes, FaCode, FaBug, FaGlobe, FaFilm, FaShieldAlt, FaFolderOpen, FaTrashAlt
} from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import { getStudioSessions, createStudioSession, uploadStudioFile, sendStudioMessage, deleteStudioSession } from "../../api"
import { formatDate } from "../../components/app/runTools"
import "../../styles/studio.css"

const STARTERS = [
    { icon: FaCode, title: "Build a landing page", text: "Build a one page landing site for a coffee shop with HTML and CSS. Make it look modern and work on phones." },
    { icon: FaBug, title: "Fix a bug in my repo", text: "Run the tests of this project, find what fails and fix it." },
    { icon: FaFilm, title: "Edit a video", text: "Cut my video to the best 30 seconds, make it vertical for Instagram and add the title in big white text." },
    { icon: FaGlobe, title: "Learn a library", text: "Search how to use FastAPI background tasks and build a small working example with a test." }
]

const POWERS = [
    { icon: FaCode, text: "Writes and runs code" },
    { icon: FaBug, text: "Tests and debugs" },
    { icon: FaGlobe, text: "Searches the web" },
    { icon: FaFilm, text: "Edits video, audio and images" },
    { icon: FaShieldAlt, text: "Verifies with forks" }
]

function sizeText(bytes) {
    if (bytes > 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
    return Math.max(1, Math.round(bytes / 1024)) + " KB"
}

export default function Studio() {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [allowed, setAllowed] = useState(true)
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState("")
    const [repo, setRepo] = useState("")
    const [branch, setBranch] = useState("")
    const [showRepo, setShowRepo] = useState(false)
    const [files, setFiles] = useState([])
    const [busy, setBusy] = useState("")
    const [error, setError] = useState("")
    const fileInput = useRef(null)
    const box = useRef(null)

    useEffect(() => {
        async function load() {
            const data = await getStudioSessions()
            if (data.Message === true) {
                setSessions(data.data)
                setAllowed(data.allowed)
            }
            setLoading(false)
        }
        load()
    }, [])

    function pickFiles(e) {
        const list = [...files]
        for (const f of e.target.files) {
            list.push(f)
        }
        setFiles(list)
        e.target.value = ""
    }

    function removeFile(index) {
        const list = []
        for (let i = 0; i < files.length; i++) {
            if (i !== index) {
                list.push(files[i])
            }
        }
        setFiles(list)
    }

    function pickStarter(starter) {
        setText(starter.text)
        if (starter.title === "Fix a bug in my repo") {
            setShowRepo(true)
        }
        if (box.current) {
            box.current.focus()
        }
    }

    async function start(e) {
        if (e) {
            e.preventDefault()
        }
        setError("")
        if (text.trim() === "") {
            setError("Write what you want Forkwise Studio to do.")
            return
        }
        if (showRepo && repo.trim() !== "" && !repo.trim().startsWith("https://")) {
            setError("Paste the https link of a public repository, for example https://github.com/user/project")
            return
        }

        setBusy("Creating your workspace...")
        const created = await createStudioSession({ repo_url: showRepo ? repo.trim() : "", branch: showRepo ? branch.trim() : "" })
        if (created.Message === "login") {
            navigate("/auth/login")
            return
        }
        if (created.Message !== true) {
            setBusy("")
            setError(created.error || "Something went wrong.")
            return
        }

        for (let i = 0; i < files.length; i++) {
            const f = files[i]
            const uploaded = await uploadStudioFile(created.id, f, (p) => setBusy("Uploading " + f.name + " " + p + "%"))
            if (uploaded.Message !== true) {
                setBusy("")
                setError(uploaded.error || "The upload failed.")
                navigate("/studio/" + created.id)
                return
            }
        }

        setBusy("Sending...")
        await sendStudioMessage(created.id, text.trim())
        navigate("/studio/" + created.id)
    }

    function onKey(e) {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            start(e)
        }
    }

    async function remove(id, e) {
        e.stopPropagation()
        if (!window.confirm("Delete this chat and its files?")) {
            return
        }
        await deleteStudioSession(id)
        const list = []
        for (const s of sessions) {
            if (s.id !== id) {
                list.push(s)
            }
        }
        setSessions(list)
    }

    return (
        <AppLayout title="Studio" crumbs={[{ label: "Studio" }]} noHead>
            <section className="st-home">
                <p className="fw-eyebrow">Forkwise Studio</p>
                <h1 className="st-home-title">What do you want to build today?</h1>
                <p className="st-home-lead">Code, fix, research and edit media in one chat. Every change runs in a private sandbox, and every claim is checked.</p>

                {!allowed && (
                    <div className="fw-alert fw-alert-info" style={{ maxWidth: 760, width: "100%" }}>Forkwise Studio is in private beta. It opens for all accounts soon.</div>
                )}

                <form className="st-composer st-composer-big" onSubmit={start}>
                    <textarea
                        ref={box}
                        dir="auto"
                        rows={4}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Describe what you want. Any language works, for example: یک صفحه فرود برای کافه بساز"
                        aria-label="What do you want to build"
                    />

                    {files.length > 0 && (
                        <div className="st-chips">
                            {files.map((f, i) => (
                                <span key={i} className="st-chip" dir="auto">
                                    <FaPaperclip /> {f.name} <small>{sizeText(f.size)}</small>
                                    <button type="button" onClick={() => removeFile(i)} aria-label={"Remove " + f.name}><FaTimes /></button>
                                </span>
                            ))}
                        </div>
                    )}

                    {showRepo && (
                        <div className="st-repo">
                            <div className="fw-input-icon" style={{ flex: 2 }}>
                                <FaGithub />
                                <input className="fw-input" placeholder="https://github.com/user/project (public)" value={repo} onChange={(e) => setRepo(e.target.value)} dir="ltr" />
                            </div>
                            <input className="fw-input" style={{ flex: 1 }} placeholder="branch (optional)" value={branch} onChange={(e) => setBranch(e.target.value)} dir="ltr" />
                        </div>
                    )}

                    <div className="st-composer-bar">
                        <div className="st-composer-tools">
                            <button type="button" className="st-tool-btn" onClick={() => fileInput.current.click()}><FaPaperclip /> <span>Attach</span></button>
                            <button type="button" className={showRepo ? "st-tool-btn st-tool-on" : "st-tool-btn"} onClick={() => setShowRepo(!showRepo)}><FaGithub /> <span>Repository</span></button>
                            <input ref={fileInput} type="file" multiple hidden onChange={pickFiles} />
                        </div>
                        <button className="st-send" disabled={busy !== "" || !allowed} aria-label="Start">
                            {busy !== "" ? <span className="fw-spinner"></span> : <FaArrowUp />}
                        </button>
                    </div>
                </form>

                {busy !== "" && <p className="fw-hint">{busy}</p>}
                {error !== "" && <div className="fw-alert fw-alert-error" style={{ maxWidth: 760, width: "100%" }}>{error}</div>}

                <div className="st-starters">
                    {STARTERS.map((s) => (
                        <button key={s.title} type="button" className="st-starter" onClick={() => pickStarter(s)}>
                            <s.icon /> <span>{s.title}</span>
                        </button>
                    ))}
                </div>

                <div className="st-powers">
                    {POWERS.map((p) => (
                        <span key={p.text}><p.icon /> {p.text}</span>
                    ))}
                </div>
            </section>

            <section className="ax-card" style={{ maxWidth: 980, width: "100%", margin: "8px auto 0" }}>
                <div className="ax-card-head"><h2>Recent chats</h2></div>
                {loading && (
                    <div style={{ padding: 20, display: "grid", gap: 10 }}>
                        {[1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 40 }}></div>)}
                    </div>
                )}
                {!loading && sessions.length === 0 && (
                    <div className="fw-empty">
                        <span className="fw-empty-icon"><FaFolderOpen /></span>
                        <p>No chats yet. Start one above.</p>
                    </div>
                )}
                {!loading && sessions.length > 0 && (
                    <div className="ax-list">
                        {sessions.map((s) => (
                            <div key={s.id} className="ax-row st-row" onClick={() => navigate("/studio/" + s.id)}>
                                <span className="ax-row-id">#{s.id}</span>
                                <div className="ax-row-main">
                                    <div className="ax-row-title" dir="auto">{s.title}</div>
                                    <div className="ax-row-meta">{s.repo_url ? s.repo_url.replace("https://", "") : "Empty workspace"} · {formatDate(s.last_active)}</div>
                                </div>
                                <span className={"fw-badge st-badge-" + s.status}>{s.status}</span>
                                <button className="fw-icon-btn" onClick={(e) => remove(s.id, e)} aria-label="Delete chat"><FaTrashAlt /></button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AppLayout>
    )
}
