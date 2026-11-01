import React, { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
    FaPaperclip, FaArrowUp, FaStop, FaChevronRight, FaChevronDown, FaTerminal, FaFileAlt, FaPen, FaSearch, FaGlobe,
    FaBoxOpen, FaListUl, FaCodeBranch, FaShareSquare, FaDownload, FaShieldAlt, FaFolder, FaExclamationTriangle,
    FaInfoCircle, FaCheck, FaRegCircle, FaSpinner, FaArrowLeft, FaGithub, FaTimes, FaColumns, FaEye, FaFileArchive, FaSyncAlt,
    FaDesktop, FaServer, FaMousePointer
} from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import Markdown from "../../components/studio/Markdown"
import {
    getStudioSession, sendStudioMessage, stopStudio, uploadStudioFile, getStudioPatch, verifyStudio, studioFileUrl, exportStudio
} from "../../api"
import { buildPreview, newFilesFromPatch, inlinePage } from "../../components/studio/preview"
import Logo from "../../images/logo.svg"
import "../../styles/studio.css"

const TOOL_ICONS = {
    run_command: FaTerminal,
    install_packages: FaBoxOpen,
    read_file: FaFileAlt,
    list_files: FaFolder,
    write_file: FaPen,
    edit_file: FaPen,
    block_file: FaPen,
    block_edit: FaPen,
    research: FaSearch,
    search_code: FaSearch,
    web_search: FaGlobe,
    fetch_url: FaGlobe,
    todo_write: FaListUl,
    show_changes: FaCodeBranch,
    share_file: FaShareSquare,
    browser: FaGlobe,
    computer: FaMousePointer,
    start_server: FaServer
}

const ACTIVE = ["pending", "running", "stopping"]
const VIDEO = [".mp4", ".webm", ".mov", ".m4v"]
const IMAGE = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
const AUDIO = [".mp3", ".wav", ".ogg", ".m4a"]

function endsWithAny(name, endings) {
    const lower = (name || "").toLowerCase()
    for (const e of endings) {
        if (lower.endsWith(e)) {
            return true
        }
    }
    return false
}

function sizeText(bytes) {
    if (bytes > 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
    return Math.max(1, Math.round((bytes || 0) / 1024)) + " KB"
}

function readJson(text) {
    try {
        return JSON.parse(text)
    } catch (e) {
        return {}
    }
}

function FileCard({ info }) {
    const url = studioFileUrl(info.id)
    let preview = null
    if (endsWithAny(info.name, VIDEO)) {
        preview = <video className="st-media" src={url} controls preload="metadata" />
    } else if (endsWithAny(info.name, IMAGE)) {
        preview = <img className="st-media" src={url} alt={info.name} />
    } else if (endsWithAny(info.name, AUDIO)) {
        preview = <audio className="st-audio" src={url} controls preload="metadata" />
    }
    return (
        <div className="st-file">
            {preview}
            <div className="st-file-row">
                <FaFileAlt />
                <span className="st-file-name" dir="auto">{info.name}</span>
                <small>{sizeText(info.size)}</small>
                <a className="fw-btn fw-btn-ghost fw-btn-sm" href={url} target="_blank" rel="noopener noreferrer"><FaDownload /> Download</a>
            </div>
        </div>
    )
}

function Step({ row }) {
    const [open, setOpen] = useState(false)
    const Icon = TOOL_ICONS[row.tool] || FaTerminal
    const output = row.content || ""
    const failed = /^exit code [1-9]/.test(output)
    return (
        <div className={open ? "st-step st-step-open" : "st-step"}>
            <button type="button" className="st-step-head" onClick={() => setOpen(!open)}>
                {open ? <FaChevronDown className="st-step-caret" /> : <FaChevronRight className="st-step-caret" />}
                <Icon className="st-step-icon" />
                <span className="st-step-label" dir="ltr">{row.tool_args || row.tool}</span>
                {failed && <span className="st-step-bad">failed</span>}
            </button>
            {open && <pre className="st-step-out" dir="ltr">{output || "(no output)"}</pre>}
        </div>
    )
}

function groupMessages(messages) {
    const groups = []
    let agent = null
    for (const m of messages) {
        const upload = m.role === "file" && readJson(m.content).kind === "upload"
        if (m.role === "user" || upload) {
            agent = null
            const last = groups[groups.length - 1]
            if (last && last.type === "user") {
                last.rows.push(m)
            } else {
                groups.push({ type: "user", rows: [m] })
            }
        } else {
            if (agent === null) {
                agent = { type: "agent", rows: [] }
                groups.push(agent)
            }
            agent.rows.push(m)
        }
    }
    return groups
}

function ScreenShot({ row, onOpen }) {
    const info = readJson(row.content)
    if (!info.id) {
        return null
    }
    return (
        <button type="button" className="st-shot" onClick={() => onOpen && onOpen(info.id)} title="Show on the Screen panel">
            <img src={studioFileUrl(info.id)} alt={info.label || "Screenshot"} loading="lazy" />
            <span dir="ltr"><FaDesktop /> {info.label || "screen"}</span>
        </button>
    )
}

function ScreenPanel({ screens, chosen, onChoose, active }) {
    if (screens.length === 0) {
        return (
            <p className="st-empty">
                When Studio opens a web page or uses its virtual computer, you see its screen here, live, after every click and key press.
            </p>
        )
    }
    let current = screens[screens.length - 1]
    if (chosen !== null) {
        const found = screens.find((x) => x.id === chosen)
        if (found) {
            current = found
        }
    }
    const isLatest = current === screens[screens.length - 1]
    return (
        <div className="st-screen">
            <div className="st-screen-bar">
                <span className={active && isLatest ? "st-live st-live-on" : "st-live"}>{active && isLatest ? "LIVE" : "screenshot"}</span>
                <span className="st-screen-label" dir="ltr">{current.label}</span>
                {!isLatest && <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onChoose(null)}>Latest</button>}
            </div>
            <a href={studioFileUrl(current.id)} target="_blank" rel="noopener noreferrer" className="st-screen-frame">
                <img src={studioFileUrl(current.id)} alt={current.label || "Screen"} />
            </a>
            <div className="st-screen-strip">
                {screens.slice(-12).map((x) => (
                    <button key={x.id} className={x.id === current.id ? "st-strip-item st-strip-on" : "st-strip-item"} onClick={() => onChoose(x.id)} title={x.label}>
                        <img src={studioFileUrl(x.id)} alt="" loading="lazy" />
                    </button>
                ))}
            </div>
        </div>
    )
}

function AgentRow({ row, onScreen }) {
    if (row.role === "screen") {
        return <ScreenShot row={row} onOpen={onScreen} />
    }
    if (row.role === "export") {
        return <div className="st-note"><FaFileArchive /> <span>Making a zip of the whole project...</span></div>
    }
    if (row.role === "assistant") {
        if (!row.content || row.content.trim() === "") {
            return null
        }
        return <Markdown text={row.content} />
    }
    if (row.role === "tool") {
        return <Step row={row} />
    }
    if (row.role === "file") {
        return <FileCard info={readJson(row.content)} />
    }
    if (row.role === "error") {
        return <div className="st-note st-note-error" dir="auto"><FaExclamationTriangle /> <span>{row.content}</span></div>
    }
    return <div className="st-note" dir="auto"><FaInfoCircle /> <span>{row.content}</span></div>
}

function DiffView({ diff }) {
    if (!diff || diff.trim() === "") {
        return <p className="st-empty">No changes yet. When the agent edits files, the changes show up here.</p>
    }
    const lines = diff.split("\n").slice(0, 4000)
    return (
        <pre className="st-diff" dir="ltr">
            {lines.map((line, i) => {
                let cls = ""
                if (line.startsWith("diff --git")) {
                    cls = "st-diff-file"
                } else if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("index ") || line.startsWith("new file")) {
                    cls = "st-diff-meta"
                } else if (line.startsWith("+")) {
                    cls = "st-diff-add"
                } else if (line.startsWith("-")) {
                    cls = "st-diff-del"
                } else if (line.startsWith("@@")) {
                    cls = "st-diff-hunk"
                }
                return <div key={i} className={cls}>{line || " "}</div>
            })}
        </pre>
    )
}

function Todos({ todos }) {
    if (!todos || todos.length === 0) {
        return <p className="st-empty">For bigger jobs the agent writes its task list here, and ticks items off as it works.</p>
    }
    return (
        <ul className="st-todos">
            {todos.map((t, i) => (
                <li key={i} className={"st-todo st-todo-" + t.status} dir="auto">
                    {t.status === "done" ? <FaCheck /> : t.status === "in_progress" ? <FaSpinner className="st-spin" /> : <FaRegCircle />}
                    <span>{t.text}</span>
                </li>
            ))}
        </ul>
    )
}

function FileList({ files, messages }) {
    const shared = []
    for (const m of messages) {
        if (m.role === "file") {
            shared.push(readJson(m.content))
        }
    }
    return (
        <div className="st-files">
            {shared.length > 0 && (
                <>
                    <p className="st-panel-title">Uploads and results</p>
                    {shared.map((f) => (
                        <a key={f.id} className="st-files-item" href={studioFileUrl(f.id)} target="_blank" rel="noopener noreferrer">
                            <FaDownload /> <span dir="auto">{f.name}</span> <small>{f.kind === "upload" ? "uploaded" : "made by Studio"}</small>
                        </a>
                    ))}
                </>
            )}
            <p className="st-panel-title">Project files</p>
            {(!files || files.length === 0) && <p className="st-empty">The project is empty so far.</p>}
            {files && files.slice(0, 1500).map((f) => (
                <div key={f} className="st-files-item st-files-path" dir="ltr"><FaFileAlt /> <span>{f}</span></div>
            ))}
        </div>
    )
}

function Preview({ patch }) {
    const [page, setPage] = useState(null)
    const [reload, setReload] = useState(0)
    const result = buildPreview(patch)

    if (result.page === null) {
        return <p className="st-empty">No web page yet. When Studio creates an .html file in the project, it shows up here, live.</p>
    }

    let shown = result.page
    if (page !== null && result.pages.includes(page)) {
        shown = page
    }
    let html = result.html
    if (shown !== result.page) {
        html = inlinePage(newFilesFromPatch(patch), shown)
    }

    return (
        <div className="st-preview-wrap">
            <div className="st-panel-actions">
                <select className="fw-select st-preview-select" value={shown} onChange={(e) => setPage(e.target.value)} aria-label="Page to preview">
                    {result.pages.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => setReload(reload + 1)}><FaSyncAlt /> Reload</button>
            </div>
            <iframe key={shown + reload} className="st-preview" title="Live preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} />
            <p className="st-preview-note">Preview of pages Studio created in this chat. Images and files from your repository are not shown here.</p>
        </div>
    )
}

export default function StudioSession() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [session, setSession] = useState(null)
    const [messages, setMessages] = useState([])
    const [missing, setMissing] = useState(false)
    const [text, setText] = useState("")
    const [error, setError] = useState("")
    const [uploading, setUploading] = useState("")
    const [panel, setPanel] = useState("preview")
    const [chosenScreen, setChosenScreen] = useState(null)
    const screenCount = useRef(0)
    const [showPanel, setShowPanel] = useState(window.innerWidth > 1100)
    const [patch, setPatch] = useState("")
    const [notice, setNotice] = useState("")
    const lastId = useRef(0)
    const patchHash = useRef("")
    const listBox = useRef(null)
    const stickToBottom = useRef(true)
    const fileInput = useRef(null)
    const textBox = useRef(null)
    const wakeUp = useRef(null)

    useEffect(() => {
        let stopped = false
        let timer = null
        lastId.current = 0
        patchHash.current = ""
        setMessages([])

        let quiet = 0

        async function load() {
            const data = await getStudioSession(id, lastId.current)
            if (stopped) {
                return
            }
            if (data.Message === "login") {
                navigate("/auth/login")
                return
            }
            let delay = 10000
            if (data.Message === true) {
                setSession(data.session)
                const isActive = ACTIVE.includes(data.session.status)
                if (data.messages.length > 0) {
                    quiet = 0
                    lastId.current = data.messages[data.messages.length - 1].id
                    setMessages((old) => [...old, ...data.messages])
                } else {
                    quiet = quiet + 1
                }
                if (data.session.patch_hash !== patchHash.current) {
                    patchHash.current = data.session.patch_hash
                    const newPatch = await getStudioPatch(id)
                    if (!stopped) {
                        setPatch(newPatch)
                    }
                }
                if (isActive && data.session.worker_online) {
                    delay = quiet < 40 ? 1500 : 3000
                } else if (isActive) {
                    delay = 10000
                }
            } else if (!data.Error) {
                setMissing(true)
                return
            }
            if (document.hidden) {
                delay = 15000
            }
            timer = setTimeout(load, delay)
        }

        function onVisible() {
            if (!document.hidden) {
                clearTimeout(timer)
                timer = setTimeout(load, 200)
            }
        }
        document.addEventListener("visibilitychange", onVisible)

        wakeUp.current = () => {
            clearTimeout(timer)
            timer = setTimeout(load, 300)
        }
        load()
        return () => {
            stopped = true
            clearTimeout(timer)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [id, navigate])

    useEffect(() => {
        if (listBox.current && stickToBottom.current) {
            listBox.current.scrollTop = listBox.current.scrollHeight
        }
    }, [messages, session])

    useEffect(() => {
        if (session !== null && !ACTIVE.includes(session.status)) {
            setNotice((old) => (old.startsWith("Making a zip") ? "" : old))
        }
    }, [session])

    function onScroll() {
        const box = listBox.current
        if (box) {
            stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 120
        }
    }

    function grow(e) {
        setText(e.target.value)
        e.target.style.height = "auto"
        e.target.style.height = Math.min(e.target.scrollHeight, 260) + "px"
    }

    const active = session !== null && ACTIVE.includes(session.status)

    async function send(e) {
        if (e) {
            e.preventDefault()
        }
        if (text.trim() === "" || active) {
            return
        }
        setError("")
        const result = await sendStudioMessage(id, text.trim())
        if (result.Message === true) {
            setText("")
            if (textBox.current) {
                textBox.current.style.height = "auto"
            }
            stickToBottom.current = true
            setSession((old) => ({ ...old, status: "pending" }))
            if (wakeUp.current) {
                wakeUp.current()
            }
        } else {
            setError(result.error || "Could not send the message.")
        }
    }

    function onKey(e) {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            send(e)
        }
    }

    async function stop() {
        await stopStudio(id)
        if (wakeUp.current) {
            wakeUp.current()
        }
    }

    async function pickFiles(e) {
        const chosen = []
        for (const f of e.target.files) {
            chosen.push(f)
        }
        e.target.value = ""
        setError("")
        for (const f of chosen) {
            const result = await uploadStudioFile(id, f, (p) => setUploading(f.name + " " + p + "%"))
            if (result.Message !== true) {
                setError(result.error || "The upload failed.")
            }
        }
        setUploading("")
        if (wakeUp.current) {
            wakeUp.current()
        }
    }

    async function verify() {
        setNotice("")
        const result = await verifyStudio(id)
        if (result.Message === true) {
            navigate("/agent/" + result.id)
        } else {
            setNotice(result.error || "Could not start the forks.")
        }
    }

    async function downloadProject() {
        setNotice("")
        const result = await exportStudio(id)
        if (result.Message === true) {
            stickToBottom.current = true
            setSession((old) => ({ ...old, status: "pending" }))
            setNotice("Making a zip of your project. It appears in the chat in a moment.")
            if (wakeUp.current) {
                wakeUp.current()
            }
        } else {
            setNotice(result.error || "Could not make the zip.")
        }
    }

    function downloadPatch() {
        const blob = new Blob([patch], { type: "text/plain" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = "forkwise-studio-" + id + ".patch"
        link.click()
        URL.revokeObjectURL(link.href)
    }

    if (missing) {
        return (
            <AppLayout title="Studio" crumbs={[{ label: "Studio", to: "/studio" }, { label: "#" + id }]}>
                <div className="fw-empty"><p>This chat was not found.</p><Link to="/studio" className="fw-btn fw-btn-ghost">Back to Studio</Link></div>
            </AppLayout>
        )
    }

    const groups = groupMessages(messages)
    const screens = []
    for (const m of messages) {
        if (m.role === "screen") {
            const info = readJson(m.content)
            if (info.id) {
                screens.push({ id: info.id, label: info.label || "" })
            }
        }
    }
    if (screens.length > screenCount.current) {
        if (screenCount.current === 0 && active && panel === "preview") {
            setTimeout(() => setPanel("screen"), 0)
        }
        screenCount.current = screens.length
    }

    function openScreen(fileId) {
        setChosenScreen(fileId)
        setPanel("screen")
        setShowPanel(true)
    }
    const todos = session ? session.todos : []
    const doneCount = todos ? todos.filter((t) => t.status === "done").length : 0

    return (
        <AppLayout title={session ? session.title : "Studio"} crumbs={[{ label: "Studio", to: "/studio" }, { label: session ? session.title : "#" + id }]} flush>
            <div className={showPanel ? "st-shell" : "st-shell st-shell-full"}>
                <section className="st-chat">
                    <header className="st-head">
                        <Link to="/studio" className="fw-icon-btn" aria-label="Back to Studio"><FaArrowLeft /></Link>
                        <div className="st-head-main">
                            <b dir="auto">{session ? session.title : "Loading..."}</b>
                            <span>
                                {session && session.repo_url ? <><FaGithub /> {session.repo_url.replace("https://", "")}{session.branch ? " @" + session.branch : ""}</> : "Empty workspace"}
                            </span>
                        </div>
                        {session && <span className={"fw-badge st-badge-" + session.status}>{active ? "working" : session.status}</span>}
                        <button className="fw-icon-btn st-panel-toggle" onClick={() => setShowPanel(!showPanel)} aria-label="Show or hide the workspace panel"><FaColumns /></button>
                    </header>

                    <div className="st-messages" ref={listBox} onScroll={onScroll}>
                        {session === null && [1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 70, margin: "0 0 14px" }}></div>)}
                        {session !== null && messages.length === 0 && (
                            <div className="st-welcome">
                                <img src={Logo} alt="" width="40" height="40" />
                                <p>Ask anything: build, fix, explain, research, or edit a video. Attach files with the clip button.</p>
                            </div>
                        )}
                        {groups.map((g, i) => (
                            g.type === "user" ? (
                                <div key={i} className="st-user">
                                    {g.rows.map((r) => (
                                        r.role === "user"
                                            ? <div key={r.id} className="st-bubble" dir="auto">{r.content}</div>
                                            : <FileCard key={r.id} info={readJson(r.content)} />
                                    ))}
                                </div>
                            ) : (
                                <div key={i} className="st-agent">
                                    <img className="st-avatar" src={Logo} alt="" width="26" height="26" />
                                    <div className="st-agent-body">
                                        {g.rows.map((r) => <AgentRow key={r.id} row={r} onScreen={openScreen} />)}
                                    </div>
                                </div>
                            )
                        ))}
                        {active && (
                            <div className="st-working">
                                <span className="st-dots"><i></i><i></i><i></i></span>
                                {session.status === "pending" && !session.worker_online
                                    ? "Studio is offline right now. Your message is saved and starts as soon as Studio is back."
                                    : session.status === "pending" ? "Starting..." : session.status === "stopping" ? "Stopping..." : "Working..."}
                            </div>
                        )}
                    </div>

                    <form className="st-composer" onSubmit={send}>
                        {(error !== "" || uploading !== "" || notice !== "") && (
                            <div className="st-composer-note" dir="auto">{uploading !== "" ? "Uploading " + uploading : error || notice}</div>
                        )}
                        <textarea
                            ref={textBox}
                            dir="auto"
                            rows={1}
                            value={text}
                            onChange={grow}
                            onKeyDown={onKey}
                            placeholder={active ? "Studio is working. You can write your next message." : "Message Forkwise Studio"}
                            aria-label="Message"
                        />
                        <div className="st-composer-bar">
                            <div className="st-composer-tools">
                                <button type="button" className="st-tool-btn" onClick={() => fileInput.current.click()} disabled={uploading !== ""}><FaPaperclip /> <span>Attach</span></button>
                                {session && session.repo_url && (
                                    <button type="button" className="st-tool-btn" onClick={verify}><FaShieldAlt /> <span>Verify with forks</span></button>
                                )}
                                <input ref={fileInput} type="file" multiple hidden onChange={pickFiles} />
                            </div>
                            {active ? (
                                <button type="button" className="st-send st-send-stop" onClick={stop} aria-label="Stop"><FaStop /></button>
                            ) : (
                                <button className="st-send" disabled={text.trim() === ""} aria-label="Send"><FaArrowUp /></button>
                            )}
                        </div>
                    </form>
                </section>

                {showPanel && (
                    <aside className="st-panel">
                        <div className="st-tabs">
                            <button className={panel === "preview" ? "st-tab st-tab-on" : "st-tab"} onClick={() => setPanel("preview")}><FaEye /> Preview</button>
                            <button className={panel === "screen" ? "st-tab st-tab-on" : "st-tab"} onClick={() => setPanel("screen")}><FaDesktop /> Screen {screens.length > 0 && active ? <i className="st-live-dot"></i> : null}</button>
                            <button className={panel === "changes" ? "st-tab st-tab-on" : "st-tab"} onClick={() => setPanel("changes")}><FaCodeBranch /> Changes</button>
                            <button className={panel === "tasks" ? "st-tab st-tab-on" : "st-tab"} onClick={() => setPanel("tasks")}><FaListUl /> Tasks {todos && todos.length > 0 ? doneCount + "/" + todos.length : ""}</button>
                            <button className={panel === "files" ? "st-tab st-tab-on" : "st-tab"} onClick={() => setPanel("files")}><FaFolder /> Files</button>
                            <button className="fw-icon-btn st-panel-close" onClick={() => setShowPanel(false)} aria-label="Close panel"><FaTimes /></button>
                        </div>
                        <div className="st-panel-body">
                            {panel === "preview" && <Preview patch={patch} />}
                            {panel === "screen" && <ScreenPanel screens={screens} chosen={chosenScreen} onChoose={setChosenScreen} active={active} />}
                            {panel === "changes" && (
                                <>
                                    {patch.trim() !== "" && (
                                        <div className="st-panel-actions">
                                            <button className="fw-btn fw-btn-primary fw-btn-sm" onClick={downloadProject} disabled={active}><FaFileArchive /> Download project</button>
                                            <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={downloadPatch}><FaDownload /> Changes as patch</button>
                                        </div>
                                    )}
                                    <DiffView diff={patch} />
                                </>
                            )}
                            {panel === "tasks" && <Todos todos={todos} />}
                            {panel === "files" && (
                                <>
                                    {session && session.files && session.files.length > 0 && (
                                        <div className="st-panel-actions">
                                            <button className="fw-btn fw-btn-primary fw-btn-sm" onClick={downloadProject} disabled={active}><FaFileArchive /> Download project</button>
                                        </div>
                                    )}
                                    <FileList files={session ? session.files : []} messages={messages} />
                                </>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </AppLayout>
    )
}
