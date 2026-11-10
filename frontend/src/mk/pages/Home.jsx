import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, BarChart3, Check, ChevronRight, Chrome, ClipboardCheck, Cpu, FolderTree, History, Laptop, Layers, LayoutDashboard, ListChecks, MonitorPlay, Plane, Scissors, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Undo2, Workflow } from "lucide-react"
import { CheckList, CodeTabs, Cta, DownloadButton, Faq, Makers, PromptBox, SectionHead, rememberPrompt, startLink, useSeo } from "../ui"
import { useStore } from "../../lib/store"
import { HOME_FAQ, API_TABS } from "../content"

const GALLERY = [
  { img: "/site/projects/nimbus.webp", icon: LayoutDashboard, title: "SaaS dashboard", time: "Built in one chat", text: "Sign in, live charts, billing and team roles on a real database.", prompt: "Build a SaaS analytics dashboard with sign in, charts, billing and team roles" },
  { img: "/site/projects/wick.webp", icon: ShoppingBag, title: "Online store", time: "Built in one chat", text: "Product pages, a cart and checkout for a candle studio.", prompt: "Build an online store for handmade candles with a cart and checkout" },
  { img: "/site/projects/fade.webp", icon: Scissors, title: "Booking app", time: "Built in one chat", text: "Services, open time slots and confirmations for a barbershop.", prompt: "Build a booking app for a barbershop with services, time slots and confirmations" },
  { img: "/site/projects/habitly.webp", icon: Smartphone, title: "Mobile habit tracker", time: "Built in one chat", text: "Streaks, reminders and weekly charts, phone first.", prompt: "Build a mobile friendly habit tracker with streaks, reminders and weekly charts" },
  { img: "/site/projects/ledger.webp", icon: BarChart3, title: "Sales report", time: "From a CSV", text: "A quarter of messy sales data turned into an interactive report.", prompt: "Turn this CSV of sales into an interactive report with charts and a summary" },
  { img: "/site/projects/atlas.webp", icon: Plane, title: "Travel site", time: "Built in one chat", text: "A landing page with search, destination cards and a clean design.", prompt: "Build a travel site landing page with a search box and destination cards" },
]

const REVIEW = [
  [FolderTree, "Project structure", "14 pages, 31 components"],
  [Layers, "Largest file", "212 lines"],
  [Workflow, "Build", "0 errors"],
  [MonitorPlay, "Opened in a browser", "phone and desktop"],
  [ListChecks, "Task list", "11 of 11 done"],
  [History, "README", "install and run"],
]

const FEATURES = [
  { icon: Cpu, title: "A real computer for every chat", text: "Installs packages, runs servers, opens a browser and fixes what breaks." },
  { icon: Laptop, title: "Your folders and terminal", text: "The desktop app edits files in place and runs your own shell." },
  { icon: Chrome, title: "Your own browser, safely", text: "Works signed in as you, in its own tab group, only on sites you allow." },
  { icon: Sparkles, title: "24 expert skills", text: "Full stack apps, design, debugging, reviews, security, deploys and more." },
  { icon: Undo2, title: "Undo anything", text: "Every message is a checkpoint. Go back and your files come back too." },
  { icon: ShieldCheck, title: "You stay in control", text: "Pushing code, sending email and risky commands always ask first." },
]

export default function Home() {
  useSeo("/")
  const { user } = useStore()
  const [value, setValue] = useState("")
  return (
    <>
      <section className="mk-hero2">
        <div className="mk-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="mk-wrap">
          <Link to="/blog/forkwise-2-2-built-to-finish" className="mk-badge"><b>NEW</b>Forkwise 2.2: built to finish<ChevronRight size={14} /></Link>
          <h1>Build complete apps<br />by chatting with AI</h1>
          <p className="mk-lead">Forkwise is an AI coding agent. Describe the app, site or fix you want, and it plans, writes the code, runs it and tests it until the job is done.</p>
          <PromptBox value={value} setValue={setValue} autoFocus />
          <div className="mk-chips">
            {GALLERY.slice(0, 4).map((item) => {
              const Icon = item.icon
              return <button type="button" key={item.title} onClick={() => setValue(item.prompt)}><Icon size={14} />{item.title}</button>
            })}
          </div>
          <p className="mk-trust">Free to start · No card needed · Nothing to install for the web app</p>
        </div>
      </section>

      <section className="mk-section tight">
        <div className="mk-wrap">
          <p className="mk-faint" style={{ textAlign: "center", margin: "0 0 22px", fontSize: 14 }}>Powered by the best coding models, picked per job</p>
          <Makers />
        </div>
      </section>

      <section className="mk-section" id="gallery">
        <div className="mk-wrap">
          <SectionHead center kicker="Built with Forkwise" title="Tell it what you want. Get the whole thing." text="Each of these came from one conversation: planned, built, run and tested." />
          <div className="mk-gallery">
            {GALLERY.map((item) => (
              <Link key={item.title} to={startLink(user, item.prompt)} onClick={() => rememberPrompt(user, item.prompt)} className="mk-shot">
                <span className="mk-shot-img"><img src={item.img} alt={item.title + " built with Forkwise"} loading="lazy" decoding="async" width="1120" height="700" /></span>
                <span className="mk-shot-meta"><strong>{item.title}</strong><span>{item.time}</span></span>
                <p>{item.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section band" id="how">
        <div className="mk-wrap">
          <SectionHead center kicker="How it works" title="From one sentence to a finished project" />
          <div className="mk-steps4">
            <div><span>01</span><h3>Describe it</h3><p>Plain words are enough. Attach files, data or screenshots if you have them.</p></div>
            <div><span>02</span><h3>It plans</h3><p>Pages, data model and API first, so the project has real structure.</p></div>
            <div><span>03</span><h3>It builds and runs</h3><p>Writes the code on a real computer, installs what it needs, runs the app and fixes errors.</p></div>
            <div><span>04</span><h3>It checks its work</h3><p>An automatic review blocks "done" until the build passes and nothing is left half finished.</p></div>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap mk-rows">
          <div className="mk-row">
            <div>
              <span className="mk-kicker">Built to finish</span>
              <h3>Complete projects, not demos</h3>
              <p>Most AI tools stop at one file that looks good in a screenshot. Forkwise builds real structure, runs the result and is checked by an automatic review before it may say done.</p>
              <CheckList items={[
                "Router, pages, components, services and a database",
                "Real sign in and real data, not mock data",
                "Runs the build and opens the app in a browser",
              ]} />
              <div className="mk-actions"><Link to="/docs/finishing-projects" className="mk-btn ghost">How the review works<ArrowRight size={16} /></Link></div>
            </div>
            <div className="mk-backdrop mint">
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(28,28,26,0.1)", boxShadow: "0 30px 60px -30px rgba(28,28,26,0.45)", overflow: "hidden" }}>
                <div className="mk-frame-bar"><ClipboardCheck size={14} />Checking the work before finishing</div>
                <div style={{ padding: 18, display: "grid", gap: 8 }}>
                  {REVIEW.map((row) => {
                    const Icon = row[0]
                    return (
                      <div key={row[1]} className="mk-step on" style={{ background: "#fff" }}>
                        <span className="ic"><Icon size={14} /></span>
                        <span>{row[1]} <code>{row[2]}</code></span>
                        <span className="ok"><Check size={14} /></span>
                      </div>
                    )
                  })}
                  <p className="mk-faint" style={{ fontSize: 12.5, margin: "6px 2px 0" }}>Example of the review on a finished build.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mk-row flip">
            <div>
              <span className="mk-kicker">In plain sight</span>
              <h3>Watch it work, step by step</h3>
              <p>Every command, file and test shows up live next to the chat: preview, files, terminals and the plan, in tabs you arrange yourself. Nothing happens behind your back.</p>
              <div className="mk-actions"><Link to="/product" className="mk-btn ghost">See the product<ArrowRight size={16} /></Link></div>
            </div>
            <div className="mk-backdrop"><img src="/site/app-workspace.webp" alt="The Forkwise workspace with preview, files and terminals" loading="lazy" decoding="async" width="1440" height="900" /></div>
          </div>

          <div className="mk-row">
            <div>
              <span className="mk-kicker">Desktop app</span>
              <h3>Works on your machine when you need it to</h3>
              <p>Open a folder and the agent reads, edits and runs your real project in your own terminal. Add Forkwise for Chrome and it can use your signed in browser, only on sites you allow.</p>
              <div className="mk-actions">
                <DownloadButton className="mk-btn go" />
                <Link to="/download" className="mk-btn ghost">All platforms</Link>
              </div>
            </div>
            <div className="mk-backdrop sky"><img src="/site/desktop-chat.webp" alt="The Forkwise desktop app" loading="lazy" decoding="async" width="1440" height="900" /></div>
          </div>

          <div className="mk-row flip">
            <div>
              <span className="mk-kicker">For developers</span>
              <h3>Put the agent in your own code</h3>
              <p>Create an API key, send a task and stream every step. Run fixes from CI, reports from a cron job, or add an AI engineer to your own product.</p>
              <div className="mk-actions"><Link to="/developers" className="mk-btn ghost">Explore the API<ArrowRight size={16} /></Link></div>
            </div>
            <div><CodeTabs tabs={API_TABS} /></div>
          </div>
        </div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="Capabilities" title="One agent. Every part of the job." />
          <div className="mk-features">
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
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap mk-narrow">
          <SectionHead center title="Questions" />
          <Faq items={HOME_FAQ.slice(0, 6)} />
        </div>
      </section>

      <Cta />
    </>
  )
}
