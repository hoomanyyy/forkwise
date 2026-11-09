import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Check, ChevronRight, Chrome, ClipboardCheck, Cpu, FolderTree, History, Laptop, Layers, ListChecks, MonitorPlay, ShieldCheck, Sparkles, Undo2, Workflow } from "lucide-react"
import Demo from "../Demo"
import { CheckList, CodeTabs, Cta, DownloadButton, Faq, Frame, Glow, Makers, Reveal, SectionHead, usePage } from "../ui"
import { useStore } from "../../lib/store"
import { HOME_FAQ, API_TABS } from "../content"

const SHOTS = [
  { key: "chat", label: "Chat", src: "/site/app-chat.webp", text: "Ask in plain words. Every step shows up live, and the result runs next to the chat." },
  { key: "workspace", label: "Workspace", src: "/site/app-workspace.webp", text: "Preview, files, changes, terminals and the plan, in tabs you add with + and arrange yourself." },
  { key: "models", label: "Models", src: "/site/app-models.webp", text: "Pick the right model for each job, grouped by maker, with search and your recent picks." },
  { key: "skills", label: "Skills", src: "/site/app-skills.webp", text: "Add an expert playbook to any message with + or by typing /. The agent also picks them by itself." },
  { key: "desktop", label: "Desktop", src: "/site/desktop-chat.webp", text: "The desktop app works in your own folders and terminal, with a full editor and live output." },
]

const FEATURES = [
  { icon: Cpu, title: "A real computer for every chat", text: "Installs packages, runs servers, opens a browser and fixes what breaks." },
  { icon: Laptop, title: "Your folders and terminal", text: "The desktop app edits files in place and runs your own shell." },
  { icon: Chrome, title: "Your own browser, safely", text: "Works signed in as you, in its own tab group, only on sites you allow." },
  { icon: Sparkles, title: "24 expert skills", text: "Full stack apps, design, debugging, reviews, security, deploys and more." },
  { icon: Undo2, title: "Undo anything", text: "Every message is a checkpoint. Go back and your files come back too." },
  { icon: ShieldCheck, title: "You stay in control", text: "Pushing code, sending email and risky commands always ask first." },
]

const REVIEW = [
  [FolderTree, "Project structure", "14 pages, 31 components"],
  [Layers, "Largest file", "212 lines"],
  [Workflow, "Build", "0 errors"],
  [MonitorPlay, "Opened in a browser", "phone and desktop"],
  [ListChecks, "Task list", "11 of 11 done"],
  [History, "README", "install and run"],
]

export default function Home() {
  usePage("", "Forkwise is the AI engineer that plans, builds, runs and checks complete projects on its own computer, your computer or your own browser.")
  const { user } = useStore()
  const [shot, setShot] = useState(0)
  const start = user ? "/app" : "/register"
  return (
    <>
      <section className="mk-hero">
        <Glow />
        <div className="mk-wrap mk-hero-in">
          <Reveal><Link to="/blog/forkwise-2-2-built-to-finish" className="mk-eyebrow"><b>NEW</b>Forkwise 2.2: built to finish<ChevronRight size={14} /></Link></Reveal>
          <Reveal index={1} as="h1" className="mk-h1">The AI engineer<br />that finishes the job</Reveal>
          <Reveal index={2} as="p" className="mk-lead">Describe what you want. Forkwise plans it, builds it as a real project, runs it, tests it and checks its own work before it tells you it is done.</Reveal>
          <Reveal index={3} className="mk-actions">
            <Link to={start} className="mk-btn go lg">{user ? "Open Forkwise" : "Get started free"}<ArrowRight size={17} /></Link>
            <DownloadButton />
          </Reveal>
          <Reveal index={4} as="p" className="mk-note">Free plan, no card needed. Works in English, Persian and more.</Reveal>
          <Reveal index={5} style={{ width: "100%" }}><Demo /></Reveal>
        </div>
      </section>

      <section className="mk-section tight">
        <div className="mk-wrap">
          <Reveal as="p" className="mk-faint" style={{ textAlign: "center", margin: "0 0 22px", fontSize: 14 }}>Use the right model for every job</Reveal>
          <Makers />
        </div>
      </section>

      <section className="mk-section" id="how">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Built to finish</span>
            <h2 className="mk-h2">Complete projects, <span className="mk-grad">not demos.</span></h2>
            <p className="mk-lead">Most AI tools stop at one file that looks good in a screenshot. Forkwise plans every page, builds real structure and is checked by an automatic review before it is allowed to say done.</p>
            <CheckList items={[
              "Plans pages, the data model and the API first",
              "Router, pages, components, services and a database",
              "Real sign in and real data, not mock data",
              "Runs the build and opens the app in a browser",
            ]} />
            <div className="mk-actions"><Link to="/docs/finishing-projects" className="mk-btn ghost">How it works<ArrowRight size={16} /></Link></div>
          </Reveal>
          <Reveal index={1}>
            <div className="mk-frame">
              <div className="mk-frame-bar"><ClipboardCheck size={14} />Checking the work before finishing</div>
              <div style={{ padding: 18, display: "grid", gap: 8 }}>
                {REVIEW.map((row) => {
                  const Icon = row[0]
                  return (
                    <div key={row[1]} className="mk-step on">
                      <span className="ic"><Icon size={14} /></span>
                      <span>{row[1]} <code>{row[2]}</code></span>
                      <span className="ok"><Check size={14} /></span>
                    </div>
                  )
                })}
                <p className="mk-faint" style={{ fontSize: 12.5, margin: "6px 2px 0" }}>Example of the review on a finished build.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap mk-showcase">
          <SectionHead center kicker="The product" title="Everything the agent does, in plain sight" text="Real screenshots of Forkwise as it ships today." />
          <div className="mk-tabs" role="tablist">
            {SHOTS.map((item, index) => <button type="button" role="tab" aria-selected={index === shot} key={item.key} className={index === shot ? "on" : ""} onClick={() => setShot(index)}>{item.label}</button>)}
          </div>
          <p className="mk-showcase-text">{SHOTS[shot].text}</p>
          <Frame key={SHOTS[shot].key} src={SHOTS[shot].src} alt={SHOTS[shot].label} label={SHOTS[shot].label} />
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <SectionHead kicker="Capabilities" title={<>One agent. <span className="mk-grad">Every part of the job.</span></>} />
          <Reveal className="mk-features">
            {FEATURES.map((item) => {
              const Icon = item.icon
              return (
                <div className="mk-feature" key={item.title}>
                  <Icon size={20} strokeWidth={1.7} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              )
            })}
          </Reveal>
        </div>
      </section>

      <section className="mk-section band" id="desktop">
        <div className="mk-wrap mk-split flip">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Desktop app</span>
            <h2 className="mk-h2">Works on your machine <span className="mk-grad">when you need it to.</span></h2>
            <p className="mk-lead">Open a folder and the agent reads, edits and runs your real project in your own terminal. Add Forkwise for Chrome and it can use your signed in browser, only on the sites you allow.</p>
            <CheckList items={["Only folders you open or approve", "Per site permission in your browser", "Emergency stop with one shortcut"]} />
            <div className="mk-actions">
              <DownloadButton className="mk-btn go" />
              <Link to="/download" className="mk-btn ghost">All platforms</Link>
            </div>
          </Reveal>
          <Reveal index={1}><Frame src="/site/desktop-chat.webp" alt="The Forkwise desktop app" label="Forkwise Desktop" /></Reveal>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">For developers</span>
            <h2 className="mk-h2">Put the agent <span className="mk-grad">in your own code.</span></h2>
            <p className="mk-lead">Create an API key, send a task and stream every step. Run fixes from CI, reports from a cron job, or add an AI engineer to your own product.</p>
            <div className="mk-actions">
              <Link to="/developers" className="mk-btn ghost">Explore the API<ArrowRight size={16} /></Link>
            </div>
          </Reveal>
          <Reveal index={1}><CodeTabs tabs={API_TABS} /></Reveal>
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap mk-narrow">
          <SectionHead center title="Questions" />
          <Faq items={HOME_FAQ.slice(0, 6)} />
        </div>
      </section>

      <div style={{ paddingTop: 96 }}><Cta /></div>
    </>
  )
}

