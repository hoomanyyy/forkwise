import React, { useState, useEffect, useRef } from "react"
import { FiArrowUp, FiMessageCircle, FiSearch, FiExternalLink, FiCopy } from "react-icons/fi"
import { TopBar, VerdictBadge } from "../components/Parts"
import { getChatHistory, sendChat } from "../api"
import { shortDate } from "../verdicts"
import { tap } from "../native"
import "../styles/Assistant.css"

const SUGGESTIONS = [
    "Explain this result in simple words",
    "Why do the analysts disagree?",
    "Which choice changed the result the most?",
    "Draw a chart of the effect of each analyst"
]

function splitChart(text) {
    const match = text.match(/\[\[chart:\s*(\{.*?\})\s*\]\]/s)
    if (!match) {
        return { text: text, chart: null }
    }
    let chart = null
    try {
        chart = JSON.parse(match[1])
    } catch (e) {
        chart = null
    }
    return { text: text.replace(match[0], "").trim(), chart: chart }
}

function boldParts(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
        if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) {
            return <strong key={i}>{p.slice(2, -2)}</strong>
        }
        return p
    })
}

function Formatted({ text }) {
    const blocks = []
    let list = null
    text.split("\n").forEach((line) => {
        const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/)
        if (m) {
            if (list === null) {
                list = []
                blocks.push({ type: "list", items: list })
            }
            list.push(m[1])
        } else {
            list = null
            if (line.trim() !== "") {
                blocks.push({ type: "p", text: line })
            }
        }
    })
    return (
        <>
            {blocks.map((b, i) => b.type === "list" ? (
                <ul key={i}>{b.items.map((item, j) => <li key={j}>{boldParts(item)}</li>)}</ul>
            ) : (
                <p key={i}>{boldParts(b.text)}</p>
            ))}
        </>
    )
}

function MiniChart({ chart }) {
    const labels = chart.labels || []
    const values = (chart.values || []).map((v) => Number(v))
    if (labels.length === 0 || labels.length !== values.length || values.some((v) => isNaN(v))) {
        return null
    }
    const width = 320
    const height = 170
    const top = 12
    const bottom = 24
    let low = Math.min(0, ...values)
    let high = Math.max(0, ...values)
    if (low === high) {
        high = low + 1
    }
    const y = (v) => top + ((high - v) / (high - low)) * (height - top - bottom)
    const step = (width - 16) / values.length
    return (
        <div className="AsChart">
            {chart.title && <p>{chart.title}</p>}
            <svg viewBox={"0 0 " + width + " " + height}>
                <line x1="8" x2={width - 8} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.25)" />
                {values.map((v, i) => (
                    <rect
                        key={i}
                        x={8 + i * step + step * 0.15}
                        width={step * 0.7}
                        y={Math.min(y(v), y(0))}
                        height={Math.max(1, Math.abs(y(v) - y(0)))}
                        rx="3"
                        fill={v >= 0 ? "#7c6cff" : "#f87171"}
                    />
                ))}
                {labels.length <= 10 && labels.map((l, i) => (
                    <text key={i} x={8 + i * step + step / 2} y={height - 8} textAnchor="middle" className="ChartTick">{String(l).slice(0, 6)}</text>
                ))}
            </svg>
        </div>
    )
}

export function ChatScreen({ run, onBack, onOpenResult }) {
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [copied, setCopied] = useState(null)
    const listRef = useRef(null)

    useEffect(() => {
        async function load() {
            const data = await getChatHistory(run.id)
            if (data.Message === true) {
                const list = []
                for (const m of data.messages || []) {
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

    async function send(value, isRetry) {
        const question = (value !== undefined ? value : text).trim()
        if (question === "" || loading) {
            return
        }
        tap()
        setText("")
        setMessages((old) => {
            const clean = isRetry ? old.filter((m) => m.role !== "error") : old
            return [...clean, { role: "user", text: question }]
        })
        setLoading(true)
        const result = await sendChat(run.id, question)
        setLoading(false)
        if (result.ok) {
            setMessages((old) => [...old, { role: "ai", text: result.text }])
        } else {
            setMessages((old) => [...old, { role: "error", text: result.error, retry: question }])
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
        <div className="AsChatShell AppSlideIn">
            <div className="AsChatTop">
                <TopBar
                    title="Assistant"
                    onBack={onBack}
                    right={onOpenResult ? <button className="AppIconButton" onClick={() => { tap(); onOpenResult(run.id) }} aria-label="Open result"><FiExternalLink /></button> : null}
                />
                <div className="AsRunInfo">
                    <span className="AppEyebrow">Run #{run.id}</span>
                    <p>{run.question}</p>
                </div>
            </div>

            <div className="AsMessages" ref={listRef}>
                {loaded && messages.length === 0 && !loading && (
                    <div className="AsStart AppFadeIn">
                        <span className="AsStartIcon"><FiMessageCircle /></span>
                        <h2>Ask about this analysis</h2>
                        <p>The Assistant reads the results of every analyst in this run.</p>
                        {SUGGESTIONS.map((s) => (
                            <button key={s} className="AsSuggest" onClick={() => send(s)}>{s}</button>
                        ))}
                    </div>
                )}
                {!loaded && <div className="AppSkeleton" style={{ height: 60 }}></div>}
                {messages.map((m, i) => {
                    if (m.role === "user") {
                        return <div key={i} className="AsUser">{m.text}</div>
                    }
                    if (m.role === "error") {
                        return (
                            <div key={i} className="AsAi">
                                <div className="AppError" style={{ marginBottom: 6 }}>{m.text}</div>
                                <button className="AsTool" onClick={() => send(m.retry, true)}>Try again</button>
                            </div>
                        )
                    }
                    const parsed = splitChart(m.text)
                    return (
                        <div key={i} className="AsAi">
                            <span className="AsAiIcon"><FiMessageCircle /></span>
                            <div className="AsAiBody">
                                {parsed.chart && <MiniChart chart={parsed.chart} />}
                                <Formatted text={parsed.text} />
                                <button className="AsTool" onClick={() => copy(i, parsed.text)}><FiCopy /> {copied === i ? "Copied" : "Copy"}</button>
                            </div>
                        </div>
                    )
                })}
                {loading && (
                    <div className="AsAi">
                        <span className="AsAiIcon"><FiMessageCircle /></span>
                        <span className="AsDots"><i></i><i></i><i></i></span>
                    </div>
                )}
            </div>

            <div className="AsComposer">
                <div className="AsBox">
                    <textarea
                        rows={1}
                        maxLength={1000}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Ask about this analysis"
                        aria-label="Message"
                    />
                    <button className="AsSend" onClick={() => send()} disabled={loading || text.trim() === ""} aria-label="Send">
                        <FiArrowUp />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AssistantPage({ runs, loading, onOpenChat }) {
    const [search, setSearch] = useState("")
    const finished = runs.filter((r) => r.status === "complete")
    const word = search.trim().toLowerCase()
    const shown = finished.filter((r) => String(r.question).toLowerCase().includes(word) || String(r.id).includes(word))

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <TopBar title="Assistant" />
            <div className="AsIntro">
                <span className="AsStartIcon"><FiMessageCircle /></span>
                <div>
                    <b>Chat with your analyses</b>
                    <p>Pick a finished run and ask what the verdict means, why analysts disagree, or how to explain it.</p>
                </div>
            </div>

            <div className="AsSearch">
                <FiSearch />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search finished runs" />
            </div>

            {loading && finished.length === 0 && (
                <>
                    <div className="AppSkeleton" style={{ height: 70 }}></div>
                    <div className="AppSkeleton" style={{ height: 70 }}></div>
                </>
            )}

            {!loading && shown.length === 0 && (
                <div className="AppEmpty">
                    <FiMessageCircle />
                    <p>{finished.length === 0 ? "When an analysis is finished, you can chat about it here." : "No run matches your search."}</p>
                </div>
            )}

            {shown.map((run) => (
                <button key={run.id} className="RunRow" onClick={() => { tap(); onOpenChat(run) }}>
                    <div className="RunMain">
                        <p className="RunQuestion">{run.question}</p>
                        <div className="RunMeta">
                            <VerdictBadge run={run} />
                            <span>#{run.id} · {shortDate(run.created_at)}</span>
                        </div>
                    </div>
                    <FiMessageCircle className="RunArrow" />
                </button>
            ))}
        </div>
    )
}
