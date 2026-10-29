import React, { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { FaSearch, FaPlus, FaArrowUp, FaComments, FaExternalLinkAlt } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import ChatChart from "../../components/ChatChart"
import { splitChart, FormattedText } from "../../components/RunChat"
import { getHistory, getChatHistory, sendGenerateRequest } from "../../api"
import { timeAgo, stateLabel } from "../../components/app/runTools"

const SUGGESTIONS = [
    "Explain this result in simple words",
    "Why do the analysts disagree?",
    "Draw a chart of the effect of each analyst",
    "Which choice changed the result the most?",
    "How should I write this finding in a report?",
    "Is this result robust enough to share?"
]

function ChatPanel({ run }) {
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [copied, setCopied] = useState(null)
    const listRef = useRef(null)
    const boxRef = useRef(null)

    useEffect(() => {
        setMessages([])
        setLoaded(false)
        async function load() {
            const data = await getChatHistory(run.id)
            if (data.Message === true) {
                const list = []
                for (const m of data.messages) {
                    list.push({ role: "user", text: m.question })
                    list.push({ role: "ai", text: m.awnser })
                }
                setMessages(list)
            }
            setLoaded(true)
        }
        load()
    }, [run.id])

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages, loading])

    useEffect(() => {
        if (boxRef.current) {
            boxRef.current.style.height = "auto"
            boxRef.current.style.height = Math.min(180, boxRef.current.scrollHeight) + "px"
        }
    }, [text])

    async function send(value, isRetry) {
        const question = (value !== undefined ? value : text).trim()
        if (question === "" || loading) {
            return
        }
        setText("")
        setMessages((old) => {
            const clean = isRetry ? old.filter((m) => m.role !== "error") : old
            return [...clean, { role: "user", text: question }]
        })
        setLoading(true)
        const result = await sendGenerateRequest(question, run.id)
        setLoading(false)
        if (result.ok) {
            setMessages((old) => [...old, { role: "ai", text: result.text }])
        } else {
            setMessages((old) => [...old, { role: "error", text: result.error, retry: question }])
        }
    }

    function onKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }

    async function copy(index, value) {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(index)
            setTimeout(() => setCopied(null), 1500)
        } catch (e) {
            setCopied(null)
        }
    }

    return (
        <div className="as-chat">
            <div className="as-chat-head">
                <div>
                    <span className="fw-eyebrow">Run #{run.id}</span>
                    <b title={run.question}>{run.question}</b>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
                    {run.verdict && <span className={"fw-badge fw-badge-" + run.verdict}>{stateLabel(run.verdict)}</span>}
                    <Link to={"/runs/" + run.id} className="fw-btn fw-btn-ghost fw-btn-sm"><FaExternalLinkAlt /> Result</Link>
                </div>
            </div>

            <div className="as-messages" ref={listRef}>
                {loaded && messages.length === 0 && !loading ? (
                    <div className="as-start">
                        <span className="fw-empty-icon"><FaComments /></span>
                        <h2>What do you want to know about this run?</h2>
                        <p>The Assistant reads the results of all analysts in this run. It can explain them, compare analysts and draw simple charts.</p>
                        <div className="as-suggest">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} onClick={() => send(s)}>{s}</button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="as-thread">
                        {!loaded && <div className="fw-skeleton" style={{ height: 60 }}></div>}
                        {messages.map((m, i) => {
                            if (m.role === "user") {
                                return (
                                    <div className="as-msg as-msg-user" key={i}>
                                        <div className="as-bubble">{m.text}</div>
                                    </div>
                                )
                            }
                            if (m.role === "error") {
                                return (
                                    <div className="as-msg" key={i}>
                                        <span className="as-ai-icon"><FaComments /></span>
                                        <div className="as-ai-body">
                                            <div className="as-error">{m.text}</div>
                                            <div className="as-ai-tools"><button onClick={() => send(m.retry, true)}>Try again</button></div>
                                        </div>
                                    </div>
                                )
                            }
                            const parsed = splitChart(m.text)
                            return (
                                <div className="as-msg" key={i}>
                                    <span className="as-ai-icon"><FaComments /></span>
                                    <div className="as-ai-body">
                                        {parsed.chart && <ChatChart chart={parsed.chart} />}
                                        <FormattedText text={parsed.text} />
                                        <div className="as-ai-tools">
                                            <button onClick={() => copy(i, parsed.text)}>{copied === i ? "Copied" : "Copy"}</button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {loading && (
                            <div className="as-msg">
                                <span className="as-ai-icon"><FaComments /></span>
                                <div className="as-ai-body"><span className="as-dots"><i></i><i></i><i></i></span></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="as-composer">
                <div className="as-composer-box">
                    <textarea
                        ref={boxRef}
                        rows={1}
                        maxLength={1000}
                        placeholder="Ask about this analysis"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                        aria-label="Message"
                    />
                    <button className="as-send" onClick={() => send()} disabled={loading || text.trim() === ""} aria-label="Send">
                        <FaArrowUp />
                    </button>
                </div>
                <p className="as-composer-note">The Assistant explains results. The numbers always come from the Python analysis. Daily message limits depend on your plan.</p>
            </div>
        </div>
    )
}

function AssistantBody() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [runs, setRuns] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        async function load() {
            try {
                const data = await getHistory()
                if (data.Message === true) {
                    setRuns(data.data.filter((r) => r.status === "complete"))
                }
            } catch (e) {
                setRuns([])
            }
            setLoading(false)
        }
        load()
    }, [])

    const current = runs.find((r) => String(r.id) === String(id))
    const word = search.trim().toLowerCase()
    const shown = runs.filter((r) => r.question.toLowerCase().includes(word) || String(r.id).includes(word))

    return (
        <div className="as">
            <aside className="as-list">
                <div className="as-list-head">
                    <button className="fw-btn fw-btn-ghost fw-btn-sm fw-btn-block" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                    <div className="fw-input-icon">
                        <FaSearch />
                        <input className="fw-input" style={{ height: 36 }} placeholder="Search runs" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search runs" />
                    </div>
                </div>
                <div className="as-list-items">
                    {loading && [1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 48 }}></div>)}
                    {!loading && shown.length === 0 && <p className="fw-muted" style={{ padding: 12, fontSize: 13 }}>No finished runs yet.</p>}
                    {shown.map((r) => (
                        <Link key={r.id} to={"/assistant/" + r.id} className={current && current.id === r.id ? "as-conv as-conv-on" : "as-conv"}>
                            <b>{r.question}</b>
                            <span><i className={"ax-dot c-" + (r.verdict === "robust" ? "robust" : r.verdict === "fragile" ? "fragile" : r.verdict === "no_effect" ? "none" : "choice")}></i>#{r.id} · {timeAgo(r.created_at)}</span>
                        </Link>
                    ))}
                </div>
            </aside>

            <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
                <div className="as-mobile-pick">
                    <select className="fw-select" value={current ? current.id : ""} onChange={(e) => navigate("/assistant/" + e.target.value)} aria-label="Choose a run">
                        <option value="" disabled>Choose a finished run</option>
                        {runs.map((r) => <option key={r.id} value={r.id}>#{r.id} {r.question}</option>)}
                    </select>
                </div>
                {current ? (
                    <ChatPanel run={current} />
                ) : (
                    <div className="as-messages">
                        <div className="as-start">
                            <span className="fw-empty-icon"><FaComments /></span>
                            <h2>Chat with your analyses</h2>
                            <p>Pick a finished run and ask anything: what the verdict means, why analysts disagree, or how to explain the result to someone else.</p>
                            {loading ? (
                                <div className="fw-skeleton" style={{ height: 120, width: "100%" }}></div>
                            ) : runs.length === 0 ? (
                                <button className="fw-btn fw-btn-primary" onClick={() => navigate("/chat")}><FaPlus /> Run your first analysis</button>
                            ) : (
                                <div className="as-suggest">
                                    {runs.slice(0, 4).map((r) => (
                                        <button key={r.id} onClick={() => navigate("/assistant/" + r.id)}>
                                            <span className="fw-mono fw-muted" style={{ fontSize: 12, display: "block" }}>#{r.id} · {stateLabel(r.verdict)}</span>
                                            {r.question}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Assistant() {
    return (
        <AppLayout title="Assistant" crumbs={[{ label: "Assistant" }]} flush>
            <AssistantBody />
        </AppLayout>
    )
}
