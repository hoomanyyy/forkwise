import { useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Check, Minus, Server, KeyRound, Users, Gauge, LifeBuoy, ShieldCheck } from "lucide-react"
import { CtaBand, FeatureGrid, Frame, PageHero, Section, usePageTitle } from "../../components/site/parts"
import { Cover } from "../../components/site/Cover"
import { PLANS, TEMPLATES, USE_CASES, FAQ } from "../../content/catalog"

export function Pricing() {
  usePageTitle("Pricing", "Start free. Upgrade when Forkwise becomes part of your work.")
  const [yearly, setYearly] = useState(false)
  return (
    <>
      <PageHero
        align="center"
        kicker="Pricing"
        title="Start free. Pay when it pays off."
        lead="Every plan includes the full product: chat, web research, memory, the computer and live preview. Paid plans give you more room to build."
        actions={
          <div className="price-toggle" role="group" aria-label="Billing period">
            <button type="button" className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Yearly<small>save 20%</small></button>
          </div>
        }
      />
      <section className="section tight">
        <div className="section-inner">
          <div className="plans">
            {PLANS.map((plan) => {
              const price = yearly ? plan.yearly : plan.monthly
              return (
                <div key={plan.key} className={"plan" + (plan.featured ? " featured" : "")}>
                  {plan.tag && <span className="plan-tag">{plan.tag}</span>}
                  <h3>{plan.name}</h3>
                  <p className="plan-desc">{plan.desc}</p>
                  <div className="plan-price">
                    {price === null ? <b style={{ fontSize: 30 }}>Custom</b> : <><b>${price}</b><span>per month{yearly && price > 0 ? ", billed yearly" : ""}</span></>}
                  </div>
                  <Link to={plan.to} className={"btn " + (plan.featured ? "btn-primary" : "btn-ghost")}>{plan.cta}</Link>
                  <ul>
                    {plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="faint small center-text" style={{ marginTop: 26 }}>Prices in US dollars. Paid plans open soon; free accounts work today.</p>
        </div>
      </section>
      <Section title="Compare plans">
        <div className="table-scroll">
          <table className="compare-table">
            <thead><tr><th>Feature</th><th>Free</th><th className="ours">Pro</th><th>Premium</th><th>Teams</th></tr></thead>
            <tbody>
              {[
                ["Chat, research and memory", 1, 1, 1, 1],
                ["Private computer and live preview", 1, 1, 1, 1],
                ["Projects", 1, 1, 1, 1],
                ["Abilities it builds", 0, 1, 1, 1],
                ["Strongest models", 0, 1, 1, 1],
                ["MCP connectors", 0, 0, 1, 1],
                ["Bigger computers", 0, 0, 1, 1],
                ["Self-hosting", 0, 0, 0, 1],
                ["Admin dashboard", 0, 0, 0, 1],
              ].map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  {row.slice(1).map((value, index) => (
                    <td key={index} className={(index === 1 ? "ours " : "") + (value ? "yes" : "no")}>{value ? <Check size={16} /> : <Minus size={16} />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section className="paper" title="Billing questions">
        <div className="faq-list">
          {FAQ[3].items.concat([["What happens when I reach the limit?", "Forkwise pauses until the next day, or until you upgrade. Your chats and files stay."], ["Can I cancel any time?", "Yes. Your plan stays active until the end of the period you paid for."]]).map((item) => (
            <details key={item[0]} className="faq-item"><summary>{item[0]}</summary><p>{item[1]}</p></details>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  )
}

export function UseCases() {
  usePageTitle("Use cases", "What people build with Forkwise: websites, data reports, automation and media edits.")
  return (
    <>
      <PageHero kicker="Use cases" title="What people build with Forkwise" lead="Four kinds of work where an AI with its own computer saves hours, not minutes." />
      <section className="section tight">
        <div className="section-inner">
          <div className="card-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {USE_CASES.map((item) => (
              <Link key={item.slug} to={"/use-cases/" + item.slug} className="card">
                <div className="card-art"><Cover seed={item.slug} colors={item.color} label={item.title} /></div>
                <div className="card-body"><h3>{item.title}</h3><p>{item.short}</p><span className="text-link">See examples</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

export function UseCase() {
  const { slug } = useParams()
  const item = USE_CASES.find((entry) => entry.slug === slug)
  usePageTitle(item ? item.title : "Use case", item ? item.short : "")
  if (!item) return <Navigate to="/use-cases" replace />
  return (
    <>
      <PageHero
        kicker={item.title}
        title={item.hero}
        lead={item.lead}
        actions={<><Link to="/register" className="btn btn-brand btn-lg">Try it free</Link><Link to="/templates" className="btn btn-ghost btn-lg">Templates</Link></>}
        art={<Frame src={item.image} alt={item.title} />}
      />
      <Section className="paper">
        <div className="feature-grid cols-2">
          {item.points.map((point) => <div key={point[0]} className="feature"><h3>{point[0]}</h3><p>{point[1]}</p></div>)}
        </div>
      </Section>
      <Section title="Try saying" intro="Copy one of these into a new chat.">
        <div className="asks">
          {item.prompts.map((prompt) => (
            <div key={prompt} className="ask-row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="ask-bubble">{prompt}</div>
              <Link to={"/app?prompt=" + encodeURIComponent(prompt)} className="btn btn-soft btn-sm">Use this</Link>
            </div>
          ))}
        </div>
      </Section>
      <Section className="paper" title="Other use cases">
        <div className="card-grid">
          {USE_CASES.filter((entry) => entry.slug !== slug).map((entry) => (
            <Link key={entry.slug} to={"/use-cases/" + entry.slug} className="card">
              <div className="card-art"><Cover seed={entry.slug} colors={entry.color} label={entry.title} /></div>
              <div className="card-body"><p>{entry.short}</p></div>
            </Link>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  )
}

export function Templates() {
  usePageTitle("Templates", "Ready prompts for websites, data, automation and media.")
  const [filter, setFilter] = useState("All")
  const categories = ["All", "Websites", "Data", "Automation", "Media"]
  const shown = TEMPLATES.filter((item) => filter === "All" || item.category === filter)
  return (
    <>
      <PageHero kicker="Templates" title="Start from a prompt that works" lead="Pick a template and Forkwise opens a new chat with it. Change any detail before you send." />
      <section className="section tight">
        <div className="section-inner">
          <div className="filter-bar">
            {categories.map((name) => <button key={name} type="button" className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>)}
          </div>
          <div className="card-grid">
            {shown.map((item) => (
              <div key={item.slug} className="card template-card">
                <div className="card-art"><Cover seed={item.slug + "t"} label={item.title} colors={item.category === "Data" ? ["#1fa2ec", "#16a34a"] : item.category === "Automation" ? ["#8b7bff", "#c77a05"] : item.category === "Media" ? ["#d6334f", "#8b7bff"] : null} /></div>
                <div className="card-body">
                  <span className="chip accent" style={{ alignSelf: "flex-start" }}>{item.category}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link to={"/app?template=" + item.slug} className="btn btn-primary btn-sm">Use template</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

export function Teams() {
  usePageTitle("For teams", "Run Forkwise for your company on your own server, with your own models.")
  return (
    <>
      <PageHero
        kicker="For teams"
        title="Your own Forkwise, on your own server."
        lead="Give your team an AI engineer that runs inside your infrastructure, uses the models you choose and keeps every file on machines you control."
        actions={<><Link to="/contact?topic=Teams" className="btn btn-brand btn-lg">Talk to us</Link><Link to="/docs/self-hosting" className="btn btn-ghost btn-lg">Self-hosting guide</Link></>}
        art={<Frame src="/images/shot-admin.webp" alt="The Forkwise admin dashboard" url="forkwise.your-company.com/app/admin" />}
      />
      <Section className="paper">
        <FeatureGrid items={[
          { icon: Server, title: "Self-hosted", text: "One install script on an Ubuntu server. Updates with a single command." },
          { icon: KeyRound, title: "Your models and keys", text: "Any OpenAI-compatible provider, several at once, chosen per chat." },
          { icon: Users, title: "Shared projects", text: "Projects keep files, instructions and memories in one place." },
          { icon: Gauge, title: "Limits and usage", text: "Daily limits per user and a clear view of usage per person." },
          { icon: ShieldCheck, title: "Isolation", text: "Every workspace in its own locked container, cut off from your network." },
          { icon: LifeBuoy, title: "Setup help", text: "We help you install, connect your tools and train your team." },
        ]} />
      </Section>
      <CtaBand title="Let's set up Forkwise for your team." primary={{ to: "/contact?topic=Teams", label: "Talk to us" }} secondary={{ to: "/docs/self-hosting", label: "Read the guide" }} />
    </>
  )
}

export function Compare() {
  usePageTitle("Compare", "How Forkwise differs from chat assistants and code editors.")
  const rows = [
    ["Answers questions in plain language", 1, 1, 0],
    ["Searches the web for current facts with sources", 1, 1, 0],
    ["Writes code", 1, 1, 1],
    ["Runs the code on its own computer", 1, 0, 1],
    ["Shows a live preview next to the chat", 1, 0, 0],
    ["Checks its result in a real browser", 1, 0, 0],
    ["Works for people who don't code", 1, 1, 0],
    ["Remembers you across chats", 1, 1, 0],
    ["Writes permanent tools for itself", 1, 0, 0],
    ["Plan mode and per-message checkpoints", 1, 0, 1],
  ]
  return (
    <>
      <PageHero kicker="Compare" title="Between a chat assistant and a code editor" lead="Chat assistants talk. Code editors need a developer. Forkwise is built for the space in between: you describe it, it does the work and shows you." />
      <Section className="tight">
        <div className="table-scroll">
          <table className="compare-table">
            <thead><tr><th>What you get</th><th className="ours">Forkwise</th><th>A typical chat assistant</th><th>A typical AI code editor</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  {row.slice(1).map((value, index) => <td key={index} className={(index === 0 ? "ours " : "") + (value ? "yes" : "no")}>{value ? <Check size={16} /> : <Minus size={16} />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="faint small" style={{ marginTop: 16 }}>A general comparison of product categories. Specific products differ and change often.</p>
      </Section>
      <CtaBand />
    </>
  )
}
