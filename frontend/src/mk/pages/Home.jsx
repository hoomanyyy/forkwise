import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Brain, Check, Chrome, ClipboardCheck, Code2, Cpu, FolderTree, History, Laptop, Layers, ListChecks, Lock, MonitorPlay, PlayCircle, ShieldCheck, Sparkles, Undo2, Workflow } from "lucide-react"
import Demo from "../Demo"
import { CheckList, CodeTabs, Cta, DownloadButton, Faq, Frame, Glow, Makers, Reveal, SectionHead, rememberPrompt, startLink, usePage } from "../ui"
import { useStore } from "../../lib/store"
import { HOME_FAQ, USE_CASES, API_TABS } from "../content"

const SHOTS = [
  { key: "chat", label: "Chat and preview", src: "/site/app-chat.webp", text: "Ask in plain words. Every step the agent takes shows up live, and the result runs next to the chat." },
  { key: "workspace", label: "Workspace", src: "/site/app-workspace.webp", text: "Preview, files, changes, terminals and the plan, in tabs you add with + and arrange yourself." },
  { key: "models", label: "Models", src: "/site/app-models.webp", text: "Pick the best model for each job, grouped by maker: Claude, OpenAI, Gemini, DeepSeek, Qwen and more." },
  { key: "skills", label: "Skills", src: "/site/app-skills.webp", text: "Add an expert playbook to any message with + or by typing /. The agent also picks them by itself." },
  { key: "desktop", label: "Desktop app", src: "/site/desktop-chat.webp", text: "The desktop app works in your own folders and terminal, with syntax colored code and one click Run." },
  { key: "computer", label: "Your computer", src: "/site/app-computer.webp", text: "See which computers are linked and what the agent may do on each, including your own Chrome." },
]

const FEATURES = [
  { span: "span4", tone: "", icon: Cpu, title: "A real computer for every chat", text: "Not a sandboxed guess. Forkwise installs packages, runs servers, opens a real browser and fixes what breaks, exactly like an engineer at a desk.", shot: "/site/app-chat.webp" },
  { span: "span2", tone: "cyan", icon: Chrome, title: "Your own browser, safely", text: "With Forkwise for Chrome the agent works in your browser, signed in as you, in its own tab group, and asks before every new site.", img: "/site/chrome-allow.webp" },
  { span: "span2", tone: "blue", icon: Laptop, title: "Your folders and terminal", text: "The desktop app runs commands in your shell and edits files in place, like Cursor, on Windows, macOS and Linux." },
  { span: "span2", tone: "amber", icon: Sparkles, title: "24 expert skills", text: "Playbooks for full stack apps, design, debugging, reviews, security, deploys, research and documents." },
  { span: "span2", tone: "mint", icon: Undo2, title: "Undo anything", text: "Every message is a checkpoint. Go back one step and your files return to exactly how they were." },
  { span: "span3", tone: "coral", icon: ShieldCheck, title: "You stay in control", text: "Auto, Ask first and Plan modes. Pushing code, sending email and risky commands wait for your yes." },
  { span: "span3", tone: "", icon: Brain, title: "It remembers and grows", text: "It keeps your preferences across chats and writes itself new tools when it needs one again." },
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
          <Reveal><Link to="/changelog" className="mk-eyebrow"><b>NEW</b>Your own browser, 24 skills and the API<ArrowRight size={14} /></Link></Reveal>
          <Reveal index={1} as="h1" className="mk-h1">The AI engineer<br />that <span className="mk-grad moving">finishes the job.</span></Reveal>
          <Reveal index={2} as="p" className="mk-lead">Describe what you want. Forkwise plans it, builds it as a real multi page project, runs it, tests it, checks its own work and shows you the result, on its own computer or yours.</Reveal>
          <Reveal index={3} className="mk-actions">
            <Link to={start} className="mk-btn go lg">{user ? "Open Forkwise" : "Start building free"}<ArrowRight size={17} /></Link>
            <a href="#how" className="mk-btn ghost lg"><PlayCircle size={17} />See how it works</a>
          </Reveal>
          <Reveal index={4} as="p" className="mk-note"><b>Free plan</b> · No card needed · Works in English, Persian and more</Reveal>
          <Reveal index={5} style={{ width: "100%" }}><Demo /></Reveal>
        </div>
      </section>

      <section className="mk-section tight">
        <div className="mk-wrap">
          <Reveal as="p" className="mk-faint" style={{ textAlign: "center", margin: "0 0 18px", fontSize: 14 }}>Use the right model for every job, from the makers you already trust</Reveal>
          <Makers />
        </div>
      </section>

      <section className="mk-section tight">
        <div className="mk-wrap">
          <Reveal className="mk-facts">
            <div className="mk-fact"><b className="mk-grad">24</b><span>expert skills built in, from design to deploys</span></div>
            <div className="mk-fact"><b className="mk-grad">15+</b><span>model makers supported, pick one per chat</span></div>
            <div className="mk-fact"><b className="mk-grad">3</b><span>desktop platforms: Windows, macOS, Linux</span></div>
            <div className="mk-fact"><b className="mk-grad">1 click</b><span>to undo any step, at every message</span></div>
          </Reveal>
        </div>
      </section>

      <section className="mk-section" id="how">
        <div className="mk-wrap">
          <SectionHead center kicker="How it works" title={<>From one sentence to a <span className="mk-grad">running product</span></>} text="No setup and no prompt engineering. Write what you need the way you would brief a colleague." />
          <div className="mk-how">
            {[
              ["01", "Describe it", "Tell Forkwise what to build, fix or find out. Attach files, a design or a screenshot if you have them. It asks at most a few short questions."],
              ["02", "It plans and builds", "It loads the right skills, plans every page and the data model, writes the code as a real project and installs what it needs on a real computer."],
              ["03", "It checks, then shows you", "It runs the project, clicks through it in a browser, tests it on phone and desktop sizes and fixes what is wrong before it calls the job done."],
            ].map((item, index) => (
              <Reveal index={index} className="mk-how-item" key={item[0]}>
                <div className="num mk-grad">{item[0]}</div>
                <h3 className="mk-h3">{item[1]}</h3>
                <p>{item[2]}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="Everything in one place" title={<>A whole engineering team's toolbox, <span className="mk-grad">one chat away</span></>} />
          <div className="mk-bento">
            {FEATURES.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal index={index % 3} className={"mk-card " + item.span} key={item.title}>
                  <span className={"mk-tile big " + item.tone}><Icon size={21} /></span>
                  <h3 className="mk-h3">{item.title}</h3>
                  <p>{item.text}</p>
                  {item.shot && <div className="shot"><img src={item.shot} alt="" loading="lazy" width="1440" height="900" /></div>}
                  {item.img && <div className="shot" style={{ maxWidth: 360 }}><img src={item.img} alt="The Forkwise for Chrome permission prompt" loading="lazy" width="500" height="440" /></div>}
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap mk-showcase">
          <SectionHead center kicker="Take a look" title="The real product, not a mock up" text="Every picture below is a screenshot of Forkwise as it ships today." />
          <div className="mk-tabs" role="tablist">
            {SHOTS.map((item, index) => <button type="button" role="tab" aria-selected={index === shot} key={item.key} className={index === shot ? "on" : ""} onClick={() => setShot(index)}>{item.label}</button>)}
          </div>
          <p className="mk-showcase-text">{SHOTS[shot].text}</p>
          <Frame key={SHOTS[shot].key} src={SHOTS[shot].src} alt={SHOTS[shot].label} label={SHOTS[shot].label} />
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Built to finish</span>
            <h2 className="mk-h2">Complete projects, <span className="mk-warm">not demos</span></h2>
            <p className="mk-lead">Most AI tools stop at a single file that looks good in a screenshot. Forkwise is held to the standard of a real team, and an automatic review checks its work before it is allowed to say done.</p>
            <CheckList items={[
              "Plans every page, the data model and the API before writing code",
              "Builds real structure: router, pages, components, services, database",
              "Real sign in, real data, uploads and live updates, not mock data",
              "Runs the build after every slice and fixes every error",
              "Opens the app, clicks through it and checks phone and desktop",
              "Before finishing: no giant files, nothing left on the task list, a README",
            ]} />
            <div className="mk-actions" style={{ marginTop: 8 }}>
              <Link to={start} className="mk-btn go">Try it on your idea<ArrowRight size={16} /></Link>
            </div>
          </Reveal>
          <Reveal index={1}>
            <div className="mk-card" style={{ padding: 0 }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mk-tile mint"><ClipboardCheck size={17} /></span>
                <div><strong>Checking the work before finishing</strong><div className="mk-faint" style={{ fontSize: 13 }}>Example of the automatic review on a build</div></div>
              </div>
              <div style={{ padding: 22, display: "grid", gap: 10 }}>
                {[
                  [FolderTree, "Project structure", "14 pages, 31 components, routes split"],
                  [Layers, "Largest file", "212 lines"],
                  [Workflow, "Build", "npm run build: 0 errors"],
                  [MonitorPlay, "Opened in the browser", "desktop and phone"],
                  [ListChecks, "Task list", "11 of 11 done"],
                  [History, "README", "how to install and run"],
                ].map((row) => {
                  const Icon = row[0]
                  return (
                    <div key={row[1]} className="mk-step on" style={{ opacity: 1, transform: "none" }}>
                      <span className="ic"><Icon size={15} /></span>
                      <span>{row[1]} <code>{row[2]}</code></span>
                      <span className="ok"><Check size={14} /></span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <SectionHead kicker="Use cases" title="What people build with Forkwise" text="From a weekend idea to a fix in a big codebase. Click any example to start with it." />
          <div className="mk-cases">
            {USE_CASES.slice(0, 6).map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal index={index % 3} key={item.title}>
                  <Link to={startLink(user, item.prompt)} onClick={() => rememberPrompt(user, item.prompt)} className="mk-case" style={{ height: "100%" }}>
                    <span className={"mk-tile " + item.tone}><Icon size={17} /></span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <div className="prompt">“{item.prompt}”</div>
                    <span className="try">Start with this<ArrowRight size={14} /></span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
          <Reveal className="mk-actions" style={{ justifyContent: "center", marginTop: 32 }}>
            <Link to="/use-cases" className="mk-btn ghost">See all use cases<ArrowRight size={16} /></Link>
          </Reveal>
        </div>
      </section>

      <section className="mk-section band" id="desktop">
        <div className="mk-wrap mk-split flip">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Desktop app and Chrome</span>
            <h2 className="mk-h2">Works on <span className="mk-grad">your machine</span> when you need it to</h2>
            <p className="mk-lead">Open a folder in the desktop app and the agent reads, edits and runs your real project in your own terminal. Add Forkwise for Chrome and it can use your signed in browser for dashboards, email and admin panels, only on the sites you allow.</p>
            <CheckList items={["Only folders you open or approve", "Per site permission in your browser", "Emergency stop with one shortcut", "The AI stays in the cloud, your files stay on your computer"]} />
            <div className="mk-actions" style={{ marginTop: 8 }}>
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
            <h2 className="mk-h2">Put the agent <span className="mk-grad">in your own code</span></h2>
            <p className="mk-lead">Create an API key, send a task and stream every step the agent takes. Run nightly fixes from CI, build reports from a cron job or add an AI engineer to your own product.</p>
            <div className="mk-actions">
              <Link to="/developers" className="mk-btn soft"><Code2 size={16} />Explore the API</Link>
              <Link to="/docs/api" className="mk-btn ghost">Read the reference</Link>
            </div>
          </Reveal>
          <Reveal index={1}><CodeTabs tabs={API_TABS} /></Reveal>
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead center kicker="Security" title="Built for real work on real accounts" />
          <div className="mk-bento">
            {[
              [Lock, "Isolated computers", "Every workspace runs alone, as a normal user, with no way into other users or private networks.", "mint"],
              [ShieldCheck, "Approvals where it matters", "Sending, pushing, paying and risky commands always ask first. You can stop everything at once.", "cyan"],
              [Undo2, "Checkpoints", "Every message can be undone, with files restored exactly.", ""],
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
          <Reveal className="mk-actions" style={{ justifyContent: "center", marginTop: 28 }}><Link to="/security" className="mk-btn ghost">How we protect your work<ArrowRight size={16} /></Link></Reveal>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap mk-narrow">
          <SectionHead center kicker="Questions" title="Good to know" />
          <Faq items={HOME_FAQ} />
        </div>
      </section>

      <Cta />
    </>
  )
}
