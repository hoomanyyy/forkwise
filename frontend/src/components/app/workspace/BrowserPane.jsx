import { useEffect, useState } from "react"
import { Globe } from "lucide-react"
import { collectCalls } from "../../../lib/activity"
import { rawUrl } from "../../../lib/api"

export default function BrowserPane({ wid, messages }) {
  const shots = collectCalls(messages).filter((item) => (item.name === "browser" || item.name === "screenshot") && item.meta.image)
  const [picked, setPicked] = useState(-1)
  const index = picked >= 0 && picked < shots.length ? picked : shots.length - 1
  const current = shots[index]

  useEffect(() => {
    setPicked(-1)
  }, [shots.length])

  if (!current) {
    return (
      <div className="preview-empty">
        <Globe size={34} />
        <h3>No pages opened yet</h3>
        <p className="muted">When Forkwise opens a page in its browser, to read it or check a site, you see what it sees here.</p>
      </div>
    )
  }

  const address = current.args.url || ""
  return (
    <div className="shots-pane">
      <div className="preview-bar">
        <Globe size={14} className="faint" />
        <span className="preview-url mono" dir="ltr">{address || current.info.verb}</span>
        <span className="faint small">{index + 1} / {shots.length}</span>
      </div>
      <div className="shots-stage">
        <a href={rawUrl(wid, current.meta.image)} target="_blank" rel="noreferrer"><img src={rawUrl(wid, current.meta.image)} alt="What the browser shows" /></a>
        {current.result && current.result.content && <pre className="tool-pre shots-text" dir="ltr">{current.result.content.slice(0, 2000)}</pre>}
      </div>
      <div className="shots-strip">
        {shots.map((item, i) => (
          <button key={item.id} type="button" className={"shot-chip" + (i === index ? " on" : "")} onClick={() => setPicked(i)} title={item.args.url || item.info.verb}>
            <img src={rawUrl(wid, item.meta.image)} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}
