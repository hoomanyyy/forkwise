import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Brain, Check, Chrome, Clock, Cpu, FileDiff, FolderTree, Github, Globe, Hand, KeyRound, Laptop, ListChecks, Map as MapIcon, MonitorPlay, Plug, Sparkles, SquareTerminal, Undo2, Users, X, Zap } from "lucide-react"
import { CheckList, Cta, DownloadButton, Faq, Frame, PageHero, Reveal, SectionHead, rememberPrompt, startLink, usePage, useSeo } from "../ui"
import { COMPARE, PLANS, PRICING_FAQ, USE_CASES } from "../content"
import { useStore } from "../../lib/store"

function Split({ id, kicker, title, text, points, shot, label, flip, children }) {
  return (
    <section className="mk-section" id={id}>
      <div className={"mk-wrap mk-split" + (flip ? " flip" : "")}>
        <Reveal className="mk-split-copy">
          <span className="mk-kicker">{kicker}</span>
          <h2 className="mk-h2">{title}</h2>
          <p className="mk-lead">{text}</p>
          {points && <CheckList items={points} />}
          {children}
        </Reveal>
        <Reveal index={1}>{shot}</Reveal>
      </div>
    </section>
  )
}

export function Product() {
  useSeo("/product")
  const { user } = useStore()
  return (
    <>
      <PageHero
        kicker="Product"
        title={<>One agent. <span className="mk-grad">Every part of the job.</span></>}
        lead="Forkwise answers questions, researches the web and builds real software. It works on its own computer, on yours through the desktop app, and in your own browser, and you can watch, approve and undo every step."
        actions={<><Link to={user ? "/app" : "/register"} className="mk-btn go lg">Start free<ArrowRight size={17} /></Link><Link to="/pricing" className="mk-btn ghost lg">See pricing</Link></>}
      />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap"><Reveal><Frame src="/site/app-chat.webp" alt="Forkwise chat with live steps" label="forkwiseai.com/app" /></Reveal></div>
      </section>

      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="The workspace" title="Everything the agent does, in plain sight" text="Each tab is a different view of the same task. Add the ones you want with + and drag them in order." />
          <div className="mk-bento">
            {[
              [ListChecks, "Activity", "Every step with counts, filters and a jump to the file it changed.", ""],
              [MonitorPlay, "Preview", "The running app at desktop, tablet and phone sizes.", "blue"],
              [FolderTree, "Files", "A full code editor with the project tree.", "cyan"],
              [FileDiff, "Changes", "Line by line diffs with one click undo per file.", "mint"],
              [SquareTerminal, "Terminals", "Several shells at once, plus background servers.", "amber"],
              [MapIcon, "Plan", "The task list, updated live as the work moves.", "coral"],
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

      <Split
        id="finish"
        kicker="Built to finish"
        title={<>Real projects, checked <span className="mk-grad">before it says done</span></>}
        text="Forkwise plans like a lead engineer and builds like a team: pages, components, services, a database, sign in and tests. An automatic review blocks it from finishing while the project is broken, half done or crammed into one file."
        points={["Plans pages, data and routes first", "Builds and runs after every slice", "Clicks through the app in a real browser", "Reviews its own work before the summary"]}
        shot={<Frame src="/site/app-workspace.webp" alt="The workspace with tabs" label="Workspace" />}
      />

      <Split
        id="skills"
        flip
        kicker="Skills"
        title={<>24 expert playbooks, <span className="mk-warm">built in</span></>}
        text="Skills are step by step methods written the way senior engineers work: full stack apps, frontend design, debugging, deep code review, security audits, performance, databases, deploys, research, data analysis and office documents. The agent loads the right one by itself, or you add one with + or by typing /."
        points={["Build: full stack apps, design, APIs, databases, mobile", "Quality: debugging, reviews, tests, security, speed", "Ship: git, deploys, upgrades", "Research, data and documents"]}
        shot={<Frame src="/site/app-skills.webp" alt="The skill picker" label="Add a skill" />}
      >
        <div className="mk-actions"><Link to="/docs/skills" className="mk-btn ghost">All skills</Link></div>
      </Split>

      <Split
        id="models"
        kicker="Models"
        title="Choose the best brain for each task"
        text="Pick from models by Claude, OpenAI, Gemini, DeepSeek, Qwen, Llama, Mistral, Kimi, GLM and more, grouped by maker with search and your recent picks. Set how long reasoning models should think. If a model is busy or down, Forkwise moves to the next one and keeps working."
        shot={<Frame src="/site/app-models.webp" alt="The model picker grouped by maker" label="Models" />}
      />

      <Split
        id="desktop"
        flip
        kicker="Desktop app"
        title={<>Like Cursor, <span className="mk-grad">with an agent that finishes</span></>}
        text="Open a folder and the agent edits your real files and runs your real terminal. Name a folder in your message and it works there. There is a full editor with Monaco, a real terminal, an agent board for several tasks at once and git worktrees so agents never step on each other."
        points={["Windows, macOS and Linux", "Only folders you open or approve", "Live command output while it runs", "Emergency stop: Ctrl+Alt+Shift+X"]}
        shot={<Frame src="/site/desktop-chat.webp" alt="Forkwise desktop app" label="Forkwise Desktop" />}
      >
        <div className="mk-actions"><DownloadButton className="mk-btn go" /><Link to="/download" className="mk-btn ghost">All platforms</Link></div>
      </Split>


      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead kicker="Connected" title="It works where your work lives" />
          <div className="mk-bento">
            {[
              [Github, "GitHub", "Clone private repos, branch, commit and open pull requests. Pushing always asks first.", ""],
              [Globe, "Google", "Search mail, write drafts, use Drive, Docs, Sheets and Calendar. Sending asks first.", "blue"],
              [Plug, "MCP connectors", "Add any MCP server to reach your own tools and data.", "cyan"],
              [Clock, "Schedules", "Run a task every morning or every week, and read the report later.", "amber"],
              [KeyRound, "Secrets", "Store API keys once. Commands read them as environment variables, never written to files.", "mint"],
              [Brain, "Memory", "It remembers your preferences and facts across chats. You can see and delete everything.", "coral"],
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

      <section className="mk-section">
        <div className="mk-wrap">
          <SectionHead kicker="Control" title="Fast when you trust it, careful when you don't" />
          <div className="mk-bento">
            {[
              [Zap, "Auto", "Works on its own and asks only for actions that always need you.", "amber"],
              [Hand, "Ask first", "Every file change and command waits for your yes. You can allow a tool for the rest of the chat.", "blue"],
              [MapIcon, "Plan", "Reads and researches, writes a plan and waits for you to approve it before building.", ""],
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
            <Reveal className="mk-card span6" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <span className="mk-tile big mint"><Undo2 size={21} /></span>
              <div style={{ flex: 1, minWidth: 240 }}><h3 className="mk-h3" style={{ margin: 0 }}>Checkpoints at every message</h3><p style={{ marginTop: 6 }}>Didn't like the last change? Go back to any message and your files return to exactly how they were.</p></div>
            </Reveal>
          </div>
        </div>
      </section>
      <Cta />
    </>
  )
}

export function UseCases() {
  useSeo("/use-cases")
  const { user } = useStore()
  const [group, setGroup] = useState("All")
  const groups = ["All", "Build", "Fix", "Research"]
  const shown = USE_CASES.filter((item) => group === "All" || item.group === group)
  return (
    <>
      <PageHero center kicker="Use cases" title={<>If you can describe it, <span className="mk-grad">Forkwise can build it</span></>} lead="Pick an example to start with it, or write your own. Each one runs on a real computer and comes back working." />
      <section className="mk-section tight" style={{ paddingTop: 8 }}>
        <div className="mk-wrap">
          <div className="mk-filter" role="tablist" style={{ justifyContent: "center" }}>
            {groups.map((item) => <button type="button" role="tab" aria-selected={group === item} key={item} className={group === item ? "on" : ""} onClick={() => setGroup(item)}>{item}</button>)}
          </div>
          <div className="mk-cases">
            {shown.map((item, index) => {
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
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap">
          <SectionHead center kicker="Tips" title="Get better results in one message" />
          <div className="mk-how">
            {[
              ["Say who it is for", "\"A booking site for my barbershop in Tehran, in Persian\" beats \"a booking site\". Names, audience and language shape everything."],
              ["List the must haves", "Name the pages and features you need. Forkwise turns them into a task list and does not finish until each one is done."],
              ["Pick the stack, or don't", "Say React and FastAPI if you want them. If you don't care, it picks a well known, boring stack that is easy to run."],
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
      <Cta />
    </>
  )
}

function Cell({ value }) {
  if (value === true) return <td className="yes"><Check size={16} /></td>
  if (value === false) return <td className="no"><X size={16} /></td>
  return <td>{value}</td>
}

export function Pricing() {
  useSeo("/pricing")
  const [yearly, setYearly] = useState(true)
  return (
    <>
      <PageHero center kicker="Pricing" title={<>Start free. <span className="mk-grad">Grow when you need to.</span></>} lead="Every plan has every feature, including the desktop app, skills and the API. Paid plans give you more usage and faster support." />
      <section className="mk-section tight" style={{ paddingTop: 0 }}>
        <div className="mk-wrap" style={{ textAlign: "center" }}>
          <div className="mk-billing" role="tablist">
            <button type="button" className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly<small>save 20%</small></button>
          </div>
          <div className="mk-plans" style={{ textAlign: "left" }}>
            {PLANS.map((plan, index) => {
              const price = yearly ? plan.yearly : plan.monthly
              return (
                <Reveal index={index} className={"mk-plan" + (plan.hot ? " hot" : "")} key={plan.key}>
                  {plan.tag && <span className="mk-plan-tag">{plan.tag}</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.desc}</p>
                  <div className="mk-price">{price === null ? <b>Custom</b> : <><b>${price}</b><span>/ month{yearly && price ? ", billed yearly" : ""}</span></>}</div>
                  <Link to={plan.to} className={"mk-btn full " + (plan.hot ? "go" : "ghost")}>{plan.cta}</Link>
                  <ul>{plan.features.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul>
                </Reveal>
              )
            })}
          </div>
          <p className="mk-note" style={{ marginTop: 22 }}>Prices in US dollars. Paid in crypto through NOWPayments. Cancel any time.</p>
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap">
          <SectionHead center kicker="Compare" title="What is in each plan" />
          <Reveal className="mk-compare-wrap">
            <table className="mk-compare">
              <thead><tr><th>Feature</th><th>Free</th><th>Pro</th><th>Premium</th><th>Teams</th></tr></thead>
              <tbody>{COMPARE.map((row) => <tr key={row[0]}><td>{row[0]}</td><Cell value={row[1]} /><Cell value={row[2]} /><Cell value={row[3]} /><Cell value={row[4]} /></tr>)}</tbody>
            </table>
          </Reveal>
        </div>
      </section>
      <section className="mk-section band">
        <div className="mk-wrap mk-split">
          <Reveal className="mk-split-copy">
            <span className="mk-kicker">Teams</span>
            <h2 className="mk-h2">Bring Forkwise to <span className="mk-grad">your whole team</span></h2>
            <p className="mk-lead">Usage for everyone on one bill, an admin dashboard with limits per person, the models you choose, and help from our team to get everyone productive in the first week.</p>
            <div className="mk-actions"><Link to="/contact?topic=Teams" className="mk-btn go"><Users size={16} />Talk to us</Link></div>
          </Reveal>
          <Reveal index={1} className="mk-card">
            <CheckList items={["One bill for the whole team", "Usage limits per person", "The models you choose", "Onboarding and training sessions", "A direct line to the people who build Forkwise"]} />
          </Reveal>
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap mk-narrow">
          <SectionHead center kicker="Questions" title="Pricing questions" />
          <Faq items={PRICING_FAQ} />
        </div>
      </section>
      <Cta />
    </>
  )
}

export { Cpu, Laptop, Sparkles, Chrome }
