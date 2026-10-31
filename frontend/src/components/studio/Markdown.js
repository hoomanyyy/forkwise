import React, { useState } from "react"
import { FaCopy, FaCheck } from "react-icons/fa"

function inlineParts(text) {
    const parts = []
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g
    let last = 0
    let match = pattern.exec(text)
    while (match !== null) {
        if (match.index > last) {
            parts.push(text.slice(last, match.index))
        }
        const token = match[0]
        const key = "t" + match.index
        if (token.startsWith("`")) {
            parts.push(<code key={key} className="md-code" dir="ltr">{token.slice(1, -1)}</code>)
        } else if (token.startsWith("**")) {
            parts.push(<strong key={key}>{token.slice(2, -2)}</strong>)
        } else {
            const label = token.slice(1, token.indexOf("]"))
            const url = token.slice(token.indexOf("(") + 1, -1)
            parts.push(<a key={key} href={url} target="_blank" rel="noopener noreferrer">{label}</a>)
        }
        last = match.index + token.length
        match = pattern.exec(text)
    }
    if (last < text.length) {
        parts.push(text.slice(last))
    }
    return parts
}

export function CodeBlock({ code, language }) {
    const [copied, setCopied] = useState(false)

    function copy() {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="md-pre-wrap" dir="ltr">
            <div className="md-pre-head">
                <span>{language || "code"}</span>
                <button type="button" onClick={copy}>{copied ? <><FaCheck /> Copied</> : <><FaCopy /> Copy</>}</button>
            </div>
            <pre className="md-pre"><code>{code}</code></pre>
        </div>
    )
}

function readBlocks(text) {
    const lines = text.split("\n")
    const blocks = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line.trim().startsWith("```")) {
            const language = line.trim().slice(3).trim()
            const code = []
            i = i + 1
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                code.push(lines[i])
                i = i + 1
            }
            blocks.push({ type: "code", language: language, text: code.join("\n") })
            i = i + 1
            continue
        }
        const heading = line.match(/^(#{1,4})\s+(.*)$/)
        if (heading) {
            blocks.push({ type: "heading", level: heading[1].length, text: heading[2] })
            i = i + 1
            continue
        }
        const bullet = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/)
        if (bullet) {
            const ordered = /^\s*\d/.test(line)
            const items = []
            while (i < lines.length) {
                const item = lines[i].match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/)
                if (!item) {
                    break
                }
                items.push(item[1])
                i = i + 1
            }
            blocks.push({ type: "list", ordered: ordered, items: items })
            continue
        }
        if (line.trim() === "") {
            i = i + 1
            continue
        }
        const paragraph = []
        while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().startsWith("```") && !/^(#{1,4})\s/.test(lines[i]) && !/^\s*(?:[-*]|\d+[.)])\s+/.test(lines[i])) {
            paragraph.push(lines[i])
            i = i + 1
        }
        blocks.push({ type: "p", text: paragraph.join("\n") })
    }
    return blocks
}

export default function Markdown({ text }) {
    const blocks = readBlocks(text || "")
    const out = []
    for (let n = 0; n < blocks.length; n++) {
        const b = blocks[n]
        if (b.type === "code") {
            out.push(<CodeBlock key={n} code={b.text} language={b.language} />)
        } else if (b.type === "heading") {
            out.push(<p key={n} dir="auto" className={"md-h md-h" + b.level}>{inlineParts(b.text)}</p>)
        } else if (b.type === "list") {
            const items = []
            for (let k = 0; k < b.items.length; k++) {
                items.push(<li key={k} dir="auto">{inlineParts(b.items[k])}</li>)
            }
            out.push(b.ordered ? <ol key={n} className="md-list" dir="auto">{items}</ol> : <ul key={n} className="md-list" dir="auto">{items}</ul>)
        } else {
            out.push(<p key={n} dir="auto" className="md-p">{inlineParts(b.text)}</p>)
        }
    }
    return <div className="md">{out}</div>
}
