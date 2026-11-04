import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Box, Cpu, EyeOff, Globe2, KeyRound, Lock, Mail, MessageCircle, Network, ShieldCheck, Trash2, Users, Download } from "lucide-react"
import { BranchField, CtaBand, FeatureGrid, PageHero, Section, usePageTitle } from "../../components/site/parts"
import { Prose, headings } from "../../components/site/Cover"
import { LogoMark, Wordmark } from "../../components/ui/Logo"
import { LEGAL } from "../../content/posts"
import { api } from "../../lib/api"

const TOPICS = ["General", "Sales", "Teams", "Support", "Billing", "Press"]

export function Contact() {
  usePageTitle("Contact", "Talk to the Forkwise team.")
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
      <PageHero kicker="Contact" title="Talk to a person" lead="Questions about Forkwise, plans for your team, or something not working? We read every message." />
      <section className="section tight">
        <div className="section-inner contact-layout">
          <div>
            <h2 className="display" style={{ fontSize: 26, margin: 0 }}>Other ways to reach us</h2>
            <div className="contact-ways">
              <a className="contact-way" href="https://x.com/forkwiseai" target="_blank" rel="noreferrer"><MessageCircle size={20} /><div><strong>X (Twitter)</strong><span>@forkwiseai</span></div></a>
              <a className="contact-way" href="https://instagram.com/forkwiseai" target="_blank" rel="noreferrer"><Globe2 size={20} /><div><strong>Instagram</strong><span>@forkwiseai</span></div></a>
              <Link className="contact-way" to="/docs"><Mail size={20} /><div><strong>Documentation</strong><span>Most answers are already in the docs</span></div></Link>
            </div>
          </div>
          <form className="form-panel" onSubmit={submit}>
            {state === "sent" ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <LogoMark size={56} draw />
                <h3 className="display" style={{ fontSize: 24, margin: "18px 0 6px" }}>Message sent</h3>
                <p className="muted">Thanks, {name.split(" ")[0] || "there"}. We will reply to {email}.</p>
              </div>
            ) : (
              <>
                <div className="field"><span className="field-label">What is it about?</span>
                  <div className="topic-picker">{TOPICS.map((item) => <button key={item} type="button" className={topic === item ? "active" : ""} onClick={() => setTopic(item)}>{item}</button>)}</div>
                </div>
                <div className="form-row">
                  <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                </div>
                <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="textarea" rows={6} dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
                {error && <div className="form-error">{error}</div>}
                <button className="btn btn-primary btn-lg" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Send message"}</button>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  )
}

export function Security() {
  usePageTitle("Security", "How Forkwise isolates your work and protects your data.")
  return (
    <>
      <PageHero kicker="Security" title="Your work stays yours." lead="Forkwise runs code for you, so isolation is not optional. Here is how every workspace is locked down." />
      <section className="section tight">
        <div className="section-inner">
          <div className="trust-strip">
            {[[Box, "Own container", "Every workspace runs alone"], [Lock, "No root", "Code runs as a normal user"], [Network, "Closed network", "No access to private addresses"], [Trash2, "Your delete is real", "Deleting removes the files"]].map((item) => {
              const Icon = item[0]
              return <div key={item[1]} className="trust-item"><Icon size={22} /><div><strong>{item[1]}</strong><span>{item[2]}</span></div></div>
            })}
          </div>
        </div>
      </section>
      <Section title="How workspaces are isolated">
        <FeatureGrid items={[
          { icon: Box, title: "One container per workspace", text: "Each chat or project gets its own Docker container with its own files. Containers cannot see each other." },
          { icon: Cpu, title: "Hard limits", text: "Memory, CPU and the number of processes are capped, and idle computers are stopped." },
          { icon: Lock, title: "No special powers", text: "Code runs as a normal user with every Linux capability removed and no way to gain new ones." },
          { icon: Network, title: "Closed off from the server", text: "Workspaces reach the internet but not the server itself, its private network or cloud metadata." },
          { icon: KeyRound, title: "Safe accounts", text: "Passwords are hashed with bcrypt. Sessions use secure, HTTP-only cookies." },
          { icon: EyeOff, title: "No selling data", text: "We never sell your data. Your content is used only to run the service for you." },
        ]} />
      </Section>
      <Section className="paper" title="Report a problem" intro="Found a security issue? Tell us through the contact page with the topic Support. We take every report seriously and reply quickly.">
        <Link to="/contact?topic=Support" className="btn btn-primary">Report an issue</Link>
      </Section>
    </>
  )
}

export function Legal({ kind }) {
  const page = LEGAL[kind]
  usePageTitle(page.title, "")
  const toc = headings(page.body)
  return (
    <>
      <PageHero kicker="Legal" title={page.title} lead={"Last updated " + page.updated + "."} />
      <div className="legal-layout">
        <aside className="docs-side">
          <div className="docs-side-title">On this page</div>
          {toc.map((item) => <a key={item.id} href={"#" + item.id}>{item.title}</a>)}
          <div className="docs-side-title" style={{ marginTop: 20 }}>Legal</div>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of service</Link>
        </aside>
        <article><Prose text={page.body} /></article>
      </div>
    </>
  )
}

export function NotFound() {
  usePageTitle("Page not found", "")
  return (
    <section className="notfound">
      <BranchField quiet />
      <div className="notfound-inner">
        <b>404</b>
        <h1>This branch leads nowhere</h1>
        <p className="muted">The page you were looking for doesn't exist or has moved.</p>
        <div className="hero-actions"><Link to="/" className="btn btn-primary">Back to home</Link><Link to="/docs" className="btn btn-ghost">Read the docs</Link></div>
      </div>
    </section>
  )
}
