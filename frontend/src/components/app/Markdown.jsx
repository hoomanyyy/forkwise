import { memo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Check, Copy } from "lucide-react"

function textOf(node) {
  if (node == null) return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (node.props) return textOf(node.props.children)
  return ""
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)
  const child = Array.isArray(children) ? children[0] : children
  const className = (child && child.props && child.props.className) || ""
  const language = (className.match(/language-([\w-]+)/) || [])[1] || "text"
  const code = textOf(child)

  function copy() {
    navigator.clipboard.writeText(code.replace(/\n$/, ""))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block" dir="ltr">
      <div className="code-head">
        <span>{language}</span>
        <button type="button" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

function Link({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
}

function Table({ children }) {
  return <div className="table-wrap"><table>{children}</table></div>
}

const components = { pre: CodeBlock, a: Link, table: Table }

function MarkdownView({ text }) {
  return (
    <div className="md" dir="auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true, detect: false }]]} components={components}>
        {text || ""}
      </ReactMarkdown>
    </div>
  )
}

export default memo(MarkdownView)
