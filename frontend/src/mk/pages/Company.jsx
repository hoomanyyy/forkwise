import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Apple, ArrowRight, Box, Code2, Cpu, EyeOff, FolderLock, Globe2, Hand, Heart, KeyRound, Laptop, Lock, Mail, MessageCircle, Monitor, Network, OctagonX, Radio, Rocket, Scale, ShieldCheck, Sparkles, Terminal, Undo2, Webhook } from "lucide-react"
import { CheckList, CodeTabs, Cta, Frame, Glow, PageHero, Reveal, SectionHead, downloadUrl, usePage, useSeo, MkLogo } from "../ui"
import { API_TABS } from "../content"
import { api } from "../../lib/api"
import { useStore } from "../../lib/store"

const PLATFORMS = [
  { key: "windows", name: "Windows", icon: Monitor, note: "Windows 10 or newer, 64 bit. A guided installer.", size: "About 90 MB" },
  { key: "macos", name: "macOS", icon: Apple, note: "macOS 12 or newer on Apple silicon. Allow screen recording and accessibility when asked.", size: "" },
  { key: "linux", name: "Linux", icon: Terminal, note: "AppImage for most distributions. Screen control needs an X11 session.", size: "" },
]

export function Download() {
  useSeo("/download")
  const mine = navigator.userAgent.includes("Windows") ? "windows" : navigator.userAgent.includes("Mac") ? "macos" : "linux"
  return (
    <>
      <PageHero center kicker="Download" title={<>Forkwise, <span className="mk-grad">on your own computer</span></>} lead="The agent works in the folders you open and runs commands in your own terminal, with a full editor, real terminals and an agent board. The AI stays in the cloud; your files stay on your machine." />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap">
          <div className="mk-downloads">
            {PLATFORMS.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal index={index} className={"mk-dl" + (item.key === mine ? " mine" : "")} key={item.key}>
                  {item.key === mine && <span className="badge">Your system</span>}
                  <span className="mk-tile big"><Icon size={22} /></span>
                  <h3>{item.name}</h3>
                  <p>{item.note}</p>
                  {item.size && <p className="mk-faint" style={{ fontSize: 13 }}>{item.size}</p>}
                  <a href={downloadUrl(item.key)} className={"mk-btn full " + (item.key === mine ? "go" : "ghost")}>Download for {item.name}</a>
                </Reveal>
              )
            })}
          </div>
          <p className="mk-note" style={{ textAlign: "center", marginTop: 20 }}>Install, open the app and sign in. It links your computer to your account by itself. The installers are not code signed yet, so Windows SmartScreen or macOS may ask you to confirm the first time.</p>
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead center kicker="Get going" title="Three steps, two minutes" />
          <div className="mk-how">
            {[
              ["Install and sign in", "The app links this computer to your account on its own. Nothing to copy or paste."],
              ["Open a folder", "Or name one in your message, like \"work in D:\\projects\\shop\". The agent can only touch folders you open or approve."],
              ["Ask", "It reads, edits and runs your project in your own terminal, and you watch every step, with live output."],
            ].map((item, index) => (
              <Reveal index={index} className="mk-how-item" key={item[0]}>
                <div className="num mk-grad">{"0" + (index + 1)}</div>
                <h3 className="mk-h3">{item[0]}</h3>
                <p>{item[1]}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Forkwise for Chrome</span>
            <h2 className="mk-h2">Add <span className="mk-grad">your own browser</span></h2>
            <p className="mk-lead">The extension comes inside the desktop app. In the app open Settings, Computer, Your own Chrome and press Set up: it opens the extensions page and copies the folder for you. Works with Chrome, Edge and Brave.</p>
            <CheckList items={["Its own purple tab group, never your other tabs", "Asks once per site: this time, always, or no", "Pause and Stop in the toolbar"]} />
          </Reveal>
          <Reveal index={1}><div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", alignItems: "start" }}><div className="mk-frame"><img src="/site/chrome-allow.webp" alt="Allow Forkwise on this site" loading="lazy" width="500" height="440" /></div><div className="mk-frame"><img src="/site/chrome-popup.webp" alt="Forkwise toolbar popup" loading="lazy" width="320" height="420" /></div></div></Reveal>
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="Inside the app" title="Everything you would expect from a modern editor" />
          <div className="mk-bento">
            {[
              [Code2, "Editor", "Monaco with tabs, diffs, search and replace, and type errors across the whole project.", ""],
              [Terminal, "Real terminals", "PowerShell, cmd, Git Bash, WSL, bash or zsh, several at once.", "blue"],
              [Sparkles, "Agent board", "Run several agents at once, each on its own git branch, then review and merge.", "amber"],
              [Globe2, "Built in browser", "Open your app on localhost and let the agent click through it.", "cyan"],
              [Hand, "Approvals", "Choose what asks first: file changes, commands, the screen.", "mint"],
              [OctagonX, "Emergency stop", "Ctrl+Alt+Shift+X stops everything the agent is doing, at once.", "coral"],
            ].map((item, index) => {
              const Icon = item[0]
              return (
                <Reveal index={index % 3} className="mk-card span2" key={item[1]}>
                  <span className={"mk-tile big " + item[3]}><Icon size={21} /></span>
                  <h3 className="mk-h3">{item[1]}</h3>
                  <p>{item[2]}</p>
                </Reveal>
              )
            })}
          </div>
          <Reveal style={{ marginTop: 28 }}><Frame src="/site/desktop-settings.webp" alt="Desktop settings" label="Settings" /></Reveal>
        </div>
      </section>
      <Cta title={<>Your folders. Your terminal. <span className="mk-grad">Our agent.</span></>} />
    </>
  )
}

export function Developers() {
  useSeo("/developers")
  const { user } = useStore()
  return (
    <>
      <PageHero kicker="Forkwise API" title={<>An AI engineer, <span className="mk-grad">one HTTP call away</span></>} lead="Create an API key and drive Forkwise from scripts, CI pipelines, cron jobs and your own product. Same agent, same computer, same skills, streamed live." actions={<><Link to={user ? "/app/settings/api-keys" : "/register"} className="mk-btn go lg">Get an API key<ArrowRight size={17} /></Link><Link to="/docs/api" className="mk-btn ghost lg">Read the reference</Link></>} />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap"><Reveal><CodeTabs tabs={API_TABS} /></Reveal></div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="What you can build" title="Put the agent to work while you sleep" />
          <div className="mk-bento">
            {[
              [Rocket, "Fix on every failure", "When CI fails, send the log to Forkwise and get a fix on a branch with a pull request.", "coral"],
              [Radio, "Scheduled reports", "Every Monday, pull last week's numbers, make charts and email a PDF report.", "blue"],
              [Webhook, "Inside your product", "Let your own users describe a change and have the agent build it in a private workspace.", ""],
            ].map((item, index) => {
              const Icon = item[0]
              return (
                <Reveal index={index} className="mk-card span2" key={item[1]}>
                  <span className={"mk-tile big " + item[3]}><Icon size={21} /></span>
                  <h3 className="mk-h3">{item[1]}</h3>
                  <p>{item[2]}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Simple by design</span>
            <h2 className="mk-h2">Three endpoints get you going</h2>
            <CheckList items={["POST /api/chats starts a chat (or a project chat)", "POST /api/chats/:id/messages gives it a task and returns a run id", "GET /api/runs/:id/events streams every step as server sent events", "POST /api/runs/:id/respond answers its questions and approvals", "Bearer keys, revocable any time, usage on your plan"]} />
          </Reveal>
          <Reveal index={1} className="mk-card">
            <h3 className="mk-h3" style={{ marginTop: 0 }}>Keys are safe by default</h3>
            <p style={{ marginTop: 8 }}>A key can do anything you can do in chats, and nothing else: it cannot read or change your password, email, billing or other keys. Create one per program, see when each was last used and revoke it in one click.</p>
            <div className="mk-actions" style={{ marginTop: 18 }}><Link to={user ? "/app/settings/api-keys" : "/register"} className="mk-btn soft"><KeyRound size={16} />Manage keys</Link></div>
          </Reveal>
        </div>
      </section>
      <Cta title={<>Ship your first <span className="mk-grad">API call</span> today</>} text="Every plan includes the API. Usage counts against the same plan as the app." />
    </>
  )
}

export function Security() {
  useSeo("/security")
  return (
    <>
      <PageHero center kicker="Security" title={<>Your work <span className="mk-grad">stays yours</span></>} lead="Forkwise runs real code and can act on real accounts, so safety is built into every layer, not added on top." />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap">
          <div className="mk-bento">
            {[
              [Box, "An isolated computer per workspace", "Each chat or project gets its own computer and files. Workspaces cannot see each other or the server.", ""],
              [Lock, "No special powers", "Code runs as a normal user with hard limits on memory, CPU and processes. Idle computers are stopped.", "blue"],
              [Network, "Closed network", "Workspaces reach the internet but not private addresses, the server's network or cloud metadata.", "cyan"],
              [KeyRound, "Encrypted secrets and accounts", "Account tokens and secrets are encrypted and never shown to the model. Passwords are hashed with bcrypt.", "amber"],
              [FolderLock, "Only the folders you choose", "On your computer the agent can only touch folders you opened or approved in the desktop app.", "mint"],
              [Hand, "Approvals for risky actions", "Sending email, pushing code, paying and destructive commands always wait for your yes.", "coral"],
              [Undo2, "Checkpoints", "Every message is a restore point for the workspace files.", ""],
              [OctagonX, "Emergency stop", "One shortcut stops everything the agent is doing on your computer.", "coral"],
              [EyeOff, "No selling data", "We never sell your data. Your content is used only to run the service for you.", "blue"],
            ].map((item, index) => {
              const Icon = item[0]
              return (
                <Reveal index={index % 3} className="mk-card span2" key={item[1]}>
                  <span className={"mk-tile big " + item[3]}><Icon size={21} /></span>
                  <h3 className="mk-h3">{item[1]}</h3>
                  <p>{item[2]}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Your browser</span>
            <h2 className="mk-h2">Forkwise for Chrome follows strict rules</h2>
            <CheckList items={["Only tabs in its own Forkwise tab group", "Asks before every new site", "Never types passwords, card numbers or codes itself", "Never buys, sends or deletes without your clear yes", "Treats page text as data, never as instructions"]} />
          </Reveal>
          <Reveal index={1}><div className="mk-frame" style={{ maxWidth: 420, margin: "0 auto" }}><img src="/site/chrome-allow.webp" alt="Permission prompt" loading="lazy" width="500" height="440" /></div></Reveal>
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap mk-narrow" style={{ textAlign: "center" }}>
          <SectionHead center kicker="Report an issue" title="Found a security problem?" text="Tell us through the contact page with the topic Support. We read every report and reply quickly." />
          <Link to="/contact?topic=Support" className="mk-btn go">Report an issue</Link>
        </div>
      </section>
    </>
  )
}

export function About() {
  useSeo("/about")
  return (
    <>
      <PageHero center kicker="About" title={<>We build the engineer <span className="mk-grad">we wanted to hire</span></>} lead="Forkwise started from a simple frustration: AI tools that write code you still have to run, debug and finish yourself. We wanted one that does the whole job and is honest about what it did." />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap">
          <div className="mk-how">
            {[
              [Rocket, "Finish the job", "Done means it runs, it is tested and you can use it. Not a plan, not a draft, not a screenshot."],
              [Scale, "Be honest", "Say what was tested and what was not. Show every step. Never hide a failure behind a confident summary."],
              [Heart, "Respect people's work", "Ask before acting on accounts, keep the user in control, and make every change easy to undo."],
            ].map((item, index) => {
              const Icon = item[0]
              return (
                <Reveal index={index} className="mk-how-item" key={item[1]}>
                  <span className="mk-tile big" style={{ marginBottom: 18 }}><Icon size={21} /></span>
                  <h3 className="mk-h3">{item[1]}</h3>
                  <p>{item[2]}</p>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">The product</span>
            <h2 className="mk-h2">One chat for questions, research and real software</h2>
            <p className="mk-lead">Forkwise reads each message and decides what it needs: a short answer, a web search with sources, or a real project on a real computer. It speaks the language you write in, including Persian, and keeps your code in English.</p>
            <div className="mk-actions"><Link to="/product" className="mk-btn ghost">Tour the product</Link><Link to="/changelog" className="mk-btn ghost">What's new</Link></div>
          </Reveal>
          <Reveal index={1}><Frame src="/site/app-chat.webp" alt="Forkwise" label="Forkwise" /></Reveal>
        </div>
      </section>
      <Cta title={<>Want to work with us or <span className="mk-grad">bring Forkwise to your team?</span></>} text="We read every message." />
    </>
  )
}

const TOPICS = ["General", "Sales", "Teams", "Support", "Billing", "Press"]

export function Contact() {
  useSeo("/contact")
  const [params] = useSearchParams()
  const [topic, setTopic] = useState(TOPICS.indexOf(params.get("topic")) !== -1 ? params.get("topic") : "General")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [state, setState] = useState("")
  const [error, setError] = useState("")

  async function submit(event) {
    event.preventDefault()
    setState("sending")
    setError("")
    try {
      await api.post("/api/contact", { name, email, topic, message })
      setState("sent")
    } catch (problem) {
      setError(problem.message)
      setState("")
    }
  }

  return (
    <>
      <PageHero kicker="Contact" title={<>Talk to <span className="mk-grad">a person</span></>} lead="Questions, plans for your team, or something not working? Write to us and a person on the team replies." />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap mk-contact">
          <Reveal>
            <h2 className="mk-h3">Other ways to reach us</h2>
            <div className="mk-ways">
              <a className="mk-way" href="https://x.com/forkwiseai" target="_blank" rel="noreferrer"><span className="mk-tile"><MessageCircle size={17} /></span><div><strong>X</strong><span>@forkwiseai</span></div></a>
              <a className="mk-way" href="https://instagram.com/forkwiseai" target="_blank" rel="noreferrer"><span className="mk-tile coral"><Globe2 size={17} /></span><div><strong>Instagram</strong><span>@forkwiseai</span></div></a>
              <Link className="mk-way" to="/docs"><span className="mk-tile blue"><Mail size={17} /></span><div><strong>Documentation</strong><span>Most answers are already in the docs</span></div></Link>
            </div>
          </Reveal>
          <Reveal index={1}>
            <form className="mk-form" onSubmit={submit}>
              {state === "sent" ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <MkLogo size={52} word={false} />
                  <h3 className="mk-h3" style={{ margin: "18px 0 6px" }}>Message sent</h3>
                  <p className="mk-muted">Thanks, {name.split(" ")[0] || "there"}. We will reply to {email}.</p>
                </div>
              ) : (
                <>
                  <div className="mk-field"><span>What is it about?</span>
                    <div className="mk-topics">{TOPICS.map((item) => <button key={item} type="button" className={topic === item ? "on" : ""} onClick={() => setTopic(item)}>{item}</button>)}</div>
                  </div>
                  <div className="mk-row2">
                    <div className="mk-field"><label htmlFor="mk-name">Name</label><input id="mk-name" className="mk-input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                    <div className="mk-field"><label htmlFor="mk-email">Email</label><input id="mk-email" type="email" className="mk-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  </div>
                  <div className="mk-field"><label htmlFor="mk-msg">Message</label><textarea id="mk-msg" className="mk-textarea" rows={6} dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
                  {error && <div className="mk-error">{error}</div>}
                  <button className="mk-btn go lg" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Send message"}</button>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </>
  )
}

export function NotFound() {
  usePage("Page not found", "")
  return (
    <section className="mk-404">
      <Glow />
      <div>
        <b className="mk-grad">404</b>
        <h1 className="mk-h2" style={{ margin: "10px 0" }}>This page took a wrong turn</h1>
        <p className="mk-muted">The page you were looking for does not exist or has moved.</p>
        <div className="mk-actions" style={{ justifyContent: "center", marginTop: 20 }}><Link to="/" className="mk-btn go">Back to home</Link><Link to="/docs" className="mk-btn ghost">Read the docs</Link></div>
      </div>
    </section>
  )
}

export { Cpu, Laptop, ShieldCheck }
