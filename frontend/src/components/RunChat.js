import React, { useEffect, useRef, useState } from "react"
import { sendGenerateRequest, getChatHistory } from "../api"
import ChatChart from "./ChatChart"
import "./styles/RunChat.css"

const SUGGESTIONS = [
    "Explain this result in simple words",
    "Draw a chart of the effect of each analyst",
    "Why do the analysts disagree?",
    "Is this result robust?",
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

function inline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
        if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) {
            return <strong key={i}>{p.slice(2, -2)}</strong>
        }
        return p
    })
}

function FormattedText({ text }) {
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
            {blocks.map((b, i) =>
                b.type === "list" ? (
                    <ul className="ChatItems" key={i}>
                        {b.items.map((item, j) => (
                            <li key={j}>{inline(item)}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="ChatPara" key={i}>{inline(b.text)}</p>
                )
            )}
        </>
    )
}

export default function RunChat({ runId }) {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(null)
    const listRef = useRef(null)

    useEffect(() => {
        async function load() {
            const data = await getChatHistory(runId)
            if (data.Message === true) {
                const list = []
                for (const m of data.messages) {
                    list.push({ role: "user", text: m.question })
                    list.push({ role: "ai", text: m.awnser })
                }
                setMessages(list)
            }
        }
        load()
    }, [runId])

    useEffect(() => {
        if (open && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [messages, loading, open])

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

        const result = await sendGenerateRequest(question, runId)
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
        <>
            <div className={open ? "ChatPanel" : "ChatPanel ChatPanelHidden"}>
                <div className="ChatTop">
                    <div>
                        <p className="ChatTitle">Forkwise analyst</p>
                        <p className="ChatSub">Run #{runId}</p>
                    </div>
                    <button className="ChatClose" onClick={() => setOpen(false)} aria-label="Close chat">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                            <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                    </button>
                </div>

                <div className="ChatMessages" ref={listRef}>
                    {messages.length === 0 && !loading && (
                        <div className="ChatEmpty">
                            <p className="ChatEmptyText">Ask anything about this analysis.</p>
                            {SUGGESTIONS.map((s) => (
                                <button key={s} className="ChatSuggestion" onClick={() => send(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {messages.map((m, i) => {
                        if (m.role === "user") {
                            return (
                                <div className="ChatRow ChatRowUser" key={i}>
                                    <div className="ChatBubble ChatUser">{m.text}</div>
                                </div>
                            )
                        }

                        if (m.role === "error") {
                            return (
                                <div className="ChatRow" key={i}>
                                    <div className="ChatCol">
                                        <div className="ChatBubble ChatBad">{m.text}</div>
                                        <button className="ChatLink" onClick={() => send(m.retry, true)}>
                                            Try again
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        const parsed = splitChart(m.text)
                        return (
                            <div className="ChatRow" key={i}>
                                <div className={parsed.chart ? "ChatCol ChatColWide" : "ChatCol"}>
                                    <div className="ChatBubble ChatAi">
                                        {parsed.chart && <ChatChart chart={parsed.chart} />}
                                        <FormattedText text={parsed.text} />
                                    </div>
                                    <button className="ChatLink" onClick={() => copy(i, parsed.text)}>
                                        {copied === i ? "Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {loading && (
                        <div className="ChatRow">
                            <div className="ChatBubble ChatAi">
                                <span className="ChatDots"><i></i><i></i><i></i></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ChatInputRow">
                    <textarea
                        className="ChatInput"
                        rows={1}
                        maxLength={1000}
                        placeholder="Ask about this analysis"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <button
                        className="ChatSend"
                        onClick={() => send()}
                        disabled={loading || text.trim() === ""}
                        aria-label="Send"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 8h12M9 3l5 5-5 5" />
                        </svg>
                    </button>
                </div>
            </div>

            <button className="ChatFab" onClick={() => setOpen(!open)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v6a1.5 1.5 0 0 1-1.5 1.5H8l-3.5 3v-3h0A1.5 1.5 0 0 1 3 10.5v-6z" />
                </svg>
                <span>{open ? "Close" : "Ask AI"}</span>
            </button>
        </>
    )
}