import { useEffect, useState } from "react"
import { Check, FileCode2, Globe, ListChecks, Play, Search, Sparkles, TestTube2 } from "lucide-react"

const PROMPT = "Build an online store for my coffee roastery with a cart, accounts and an admin page"

const STEPS = [
  { icon: Sparkles, text: "Loaded skills", code: "fullstack-app, frontend-design" },
  { icon: ListChecks, text: "Planned 9 pages and the data model", code: "" },
  { icon: FileCode2, text: "Wrote", code: "src/pages/Shop.jsx +27 files" },
  { icon: Play, text: "Ran", code: "npm run build", ok: "0 errors" },
  { icon: TestTube2, text: "Tested checkout and sign in", code: "", ok: "12 passed" },
  { icon: Globe, text: "Opened the live preview", code: "390px and 1440px" },
]

export default function Demo() {
  const [typed, setTyped] = useState(0)
  const [shown, setShown] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (still) {
      setTyped(PROMPT.length)
      setShown(STEPS.length + 1)
      return undefined
    }
    setTyped(0)
    setShown(0)
    let letters = 0
    let steps = 0
    const timers = []
    const typer = setInterval(() => {
      letters = letters + 2
      setTyped(Math.min(letters, PROMPT.length))
      if (letters >= PROMPT.length) {
        clearInterval(typer)
        const stepper = setInterval(() => {
          steps = steps + 1
          setShown(steps)
          if (steps > STEPS.length) {
            clearInterval(stepper)
            timers.push(setTimeout(() => setCycle((value) => value + 1), 5200))
          }
        }, 850)
        timers.push(stepper)
      }
    }, 38)
    timers.push(typer)
    return () => timers.forEach((item) => {
      clearInterval(item)
      clearTimeout(item)
    })
  }, [cycle])

  const done = shown > STEPS.length
  return (
    <div className="mk-demo-wrap">
      <div className="mk-demo">
        <div className="mk-demo-bar"><span className="mk-dots"><i /><i /><i /></span><span className="mk-demo-url">forkwiseai.com/app</span></div>
        <div className="mk-demo-body">
          <div className="mk-demo-chat">
            <div className="mk-demo-user">{PROMPT.slice(0, typed)}{typed < PROMPT.length && <span className="mk-caret" />}</div>
            <div className="mk-steps">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const on = shown > index
                const working = shown === index + 1 && !done && index === STEPS.length - 1
                return (
                  <div key={step.text} className={"mk-step" + (on ? " on" : "")}>
                    <span className="ic">{working ? <span className="mk-spin" /> : <Icon size={15} />}</span>
                    <span>{step.text} {step.code && <code>{step.code}</code>}</span>
                    {step.ok && <span className="ok">{step.ok}</span>}
                    {!step.ok && on && <span className="ok"><Check size={14} /></span>}
                  </div>
                )
              })}
            </div>
            <div className={"mk-demo-answer" + (done ? " on" : "")}>Done. The store has shop, product, cart, checkout, account and admin pages, a SQLite database with sample products, and passes its tests. <b style={{ color: "var(--text)" }}>It is running in the preview.</b></div>
          </div>
          <div className="mk-demo-side">
            <div className="mk-demo-tabs"><span className="on">Preview</span><span>Changes</span><span>Terminal</span><span>Plan</span></div>
            <div className={"mk-site" + (done ? " on" : "")}>
              <div className="mk-site-nav">Ember Roasters<i /><span>Shop</span><span>Subscriptions</span><span>Cart (2)</span></div>
              <div className="mk-site-hero"><b>Small batch coffee, roasted this week.</b><small>Single origins and blends, delivered fresh.</small><br /><em>Shop the roast</em></div>
              <div className="mk-site-grid"><div /><div /><div /></div>
            </div>
            <div className="mk-checks">
              <span className={"mk-chip" + (shown > 3 ? " ok" : "")}><Check size={12} />Builds</span>
              <span className={"mk-chip" + (shown > 4 ? " ok" : "")}><Check size={12} />Tests pass</span>
              <span className={"mk-chip" + (done ? " ok" : "")}><Search size={12} />Checked on phone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
