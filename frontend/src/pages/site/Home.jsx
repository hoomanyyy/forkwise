import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bot, Brain, FileDiff, FolderTree, Globe, History, ListChecks, MessageSquare, MonitorPlay, Plug, Sparkles } from "lucide-react"
import { BranchField, CtaBand, Frame, FeatureGrid, Reveal, Section, Steps, usePageTitle } from "../../components/site/parts"
import { Cover } from "../../components/site/Cover"
import { FAQ, TEMPLATES } from "../../content/catalog"

const WORDS = ["a booking site", "a sales dashboard", "a Telegram bot", "a price tracker", "a portfolio", "a PDF report"]

function Typer() {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = WORDS[index]
    let delay = deleting ? 35 : 70
    if (!deleting && length === word.length) delay = 1600
    if (deleting && length === 0) delay = 300
    const timer = setTimeout(() => {
      if (!deleting && length === word.length) setDeleting(true)
      else if (deleting && length === 0) {
        setDeleting(false)
        setIndex((index + 1) % WORDS.length)
      } else setLength(length + (deleting ? -1 : 1))
    }, delay)
    return () => clearTimeout(timer)
  }, [index, length, deleting])

  return <span className="typer">{WORDS[index].slice(0, length)}<i className="typer-caret" /></span>
}

const ASKS = [
  { ask: "سلام! چطوری؟", icon: MessageSquare, title: "Just answers", text: "Small talk stays small talk. No project, no files." },
  { ask: "What's the US dollar rate in Tehran right now?", icon: Globe, title: "Searches the web first", text: "Opens the sources and replies with today's numbers and links." },
  { ask: "Remember that my company is called RHINOREL.", icon: Brain, title: "Saves it to memory", text: "Every later chat knows it, and you can delete it any time." },
  { ask: "Build a booking site for my barbershop.", icon: MonitorPlay, title: "Builds it and shows you", text: "Writes the code, runs it, checks it in a browser, opens the live preview." },
]

const SHOWCASE = [
  { key: "preview", label: "Live preview", icon: MonitorPlay, title: "See it while it builds", text: "Sites and apps run on Forkwise's computer and appear next to the chat. Switch to phone size, reload, or open it in a new tab.", image: "/images/shot-chat.webp" },
  { key: "files", label: "Files", icon: FolderTree, title: "Every file is yours", text: "Browse the project, edit any file in a full code editor, and download it all as a zip.", image: "/images/shot-files.webp" },
  { key: "changes", label: "Changes", icon: FileDiff, title: "Know exactly what changed", text: "Each task ends with a clear list of changed files and line-by-line differences.", image: "/images/shot-changes.webp" },
  { key: "plan", label: "Plan mode", icon: ListChecks, title: "Approve before it builds", text: "In Plan mode Forkwise researches first and writes a plan. Nothing changes until you approve it.", image: "/images/shot-plan.webp" },
]

function Showcase() {
  const [active, setActive] = useState(0)
  const item = SHOWCASE[active]
  return (
    <div className="showcase band-dark">
      <BranchField quiet count={7} />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div className="showcase-tabs" role="tablist">
          {SHOWCASE.map((tab, index) => {
            const Icon = tab.icon
            return (
              <button key={tab.key} type="button" role="tab" aria-selected={active === index} className={"showcase-tab" + (active === index ? " active" : "")} onClick={() => setActive(index)}>
                <Icon size={15} />{tab.label}
              </button>
            )
          })}
        </div>
        <div className="showcase-body">
          <div>
            <h3 className="display">{item.title}</h3>
            <p>{item.text}</p>
            <Link to="/product/computer" className="text-link" style={{ marginTop: 18 }}>Explore the computer</Link>
          </div>
          <div className="showcase-shot" key={item.key}><Frame src={item.image} alt={item.title} /></div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  usePageTitle("", "Forkwise is a chat assistant with its own computer. It answers, researches, remembers, and builds real websites, apps and reports you can see live.")
  return (
    <>
      <section className="home-hero">
        <div className="hero-field"><BranchField /></div>
        <div className="home-hero-copy">
          <Link to="/blog/introducing-forkwise-2" className="hero-badge"><b>New</b>Forkwise 2.0 writes tools for itself</Link>
          <h1 className="display">Say it. Forkwise ships it.</h1>
          <p className="lead">An AI engineer with its own computer. It writes the code, runs it and shows you the live result, right next to the chat.</p>
          <div className="hero-ask"><span className="faint">Try asking for</span><Typer /></div>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-brand btn-lg">Start building free<span className="btn-node" /></Link>
            <Link to="/product" className="btn btn-ghost btn-lg">See how it works</Link>
          </div>
        </div>
        <div className="hero-stage">
          <Frame priority src="/images/shot-chat.webp" alt="Forkwise building a coffee roastery website with the live preview open" />
        </div>
      </section>

      <Section title="It knows what each message needs" intro="Most assistants either only talk, or open a whole project when you say hello. Forkwise reads the request and picks the right kind of work.">
        <div className="asks">
          {ASKS.map((item, index) => {
            const Icon = item.icon
            return (
              <Reveal key={item.ask} delay={index * 80}>
                <div className="ask-row">
                  <div className="ask-bubble" dir="auto">{item.ask}</div>
                  <svg className="ask-path" viewBox="0 0 120 40" aria-hidden="true"><path d="M2 20 C 50 20, 60 20, 110 20" /><circle cx="112" cy="20" r="4" /></svg>
                  <div className="ask-result">
                    <span className="ask-result-icon"><Icon size={18} /></span>
                    <div><strong>{item.title}</strong><span>{item.text}</span></div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Section>

      <section className="section tight">
        <div className="section-inner wide"><Showcase /></div>
      </section>

      <Section title="How a task runs" intro="The same loop a careful engineer follows, done in minutes and shown step by step.">
        <Steps items={[
          { title: "Understand", text: "Reads your message, your files, your memories and the project notes." },
          { title: "Plan", text: "Writes a task list you can watch, and asks only when a choice is truly yours." },
          { title: "Build and run", text: "Writes the code, installs what it needs and runs it on its own computer." },
          { title: "Verify and show", text: "Opens the result in a real browser, fixes what is wrong, then shows you." },
        ]} />
      </Section>

      <Section className="paper" title="Everything a real engineer would have" intro="Not a demo sandbox. A full toolset, and the judgement to use it.">
        <FeatureGrid items={[
          { icon: Brain, title: "Long term memory", text: "Tell it once. Your preferences and facts carry into every chat.", to: "/product/abilities" },
          { icon: Sparkles, title: "Abilities it builds", text: "When it needs a capability again, it writes itself a tool and keeps it.", to: "/product/abilities" },
          { icon: Globe, title: "Web research", text: "Searches, reads pages and opens a real browser for sites that need JavaScript.", to: "/docs/how-forkwise-decides" },
          { icon: Bot, title: "Helper agents", text: "Hands big searches to helpers with a fresh context and combines what they find.", to: "/product" },
          { icon: Plug, title: "Connectors", text: "Connect MCP servers to reach your other apps and data.", to: "/docs/connectors" },
          { icon: History, title: "Checkpoints", text: "Every message is a restore point. Go back and the files go back too.", to: "/product/control" },
        ]} />
      </Section>

      <Section>
        <div className="split">
          <div className="split-copy">
            <h3 className="display">It gets better the more you use it</h3>
            <p>Need a live price checker, an API client or a converter? Forkwise writes the tool, tests it and keeps it. From then on it is one of its abilities, in every chat.</p>
            <ul className="ticks">
              <li>Tools are small Python programs you can read</li>
              <li>Saved skills hold your procedures in plain words</li>
              <li>Turn any ability off or delete it in one click</li>
            </ul>
            <div className="hero-actions"><Link to="/product/abilities" className="btn btn-primary">Memory and abilities</Link></div>
          </div>
          <div className="split-art">
            <pre className="code-card" dir="ltr">
              <span className="c-key">create_tool</span>  my_gold_price{"\n"}
              <span className="c-dim">  description</span>  <span className="c-str">"Live gold price per gram"</span>{"\n"}
              <span className="c-dim">  inputs</span>       {"{"} currency: <span className="c-str">"IRR"</span> {"}"}{"\n"}
              <span className="c-dim">  test run</span>     <span className="c-str">passed</span>{"\n\n"}
              <span className="c-key">my_gold_price</span>  {"{"} currency: <span className="c-str">"USD"</span> {"}"}{"\n"}
              <span className="c-dim">  result</span>       <span className="c-str">price per gram, source, time</span>{"\n\n"}
              <span className="c-dim">available in every chat from now on</span>
            </pre>
          </div>
        </div>
      </Section>

      <Section className="paper" title="Start from a template" intro="Prompts that work well, ready to send.">
        <div className="card-grid">
          {TEMPLATES.slice(0, 3).map((item) => (
            <Link key={item.slug} to={"/app?template=" + item.slug} className="card template-card">
              <div className="card-art"><Cover seed={item.slug} label={item.title} /></div>
              <div className="card-body">
                <span className="chip accent">{item.category}</span>
                <p>{item.text}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="hero-actions"><Link to="/templates" className="btn btn-ghost">Browse all templates</Link></div>
      </Section>

      <Section title="Questions people ask">
        <div className="faq-list">
          {FAQ[0].items.concat(FAQ[1].items.slice(0, 2)).map((item) => (
            <details key={item[0]} className="faq-item"><summary>{item[0]}</summary><p>{item[1]}</p></details>
          ))}
        </div>
        <div className="hero-actions"><Link to="/faq" className="text-link">All questions</Link></div>
      </Section>

      <CtaBand />
    </>
  )
}
