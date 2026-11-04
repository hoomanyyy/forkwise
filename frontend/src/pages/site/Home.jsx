import { Link } from "react-router-dom"
import { Bot, Brain, Clock, FileDiff, Github, Globe, Laptop, ListChecks, Mail, MonitorPlay, Plug, SquareTerminal } from "lucide-react"
import { CtaBand, FeatureGrid, Frame, Section, usePageTitle } from "../../components/site/parts"

export default function Home() {
  usePageTitle("", "Forkwise is an AI engineer with its own computer. It writes code, runs it, browses, uses your GitHub and Gmail, and can control your own computer.")
  return (
    <>
      <section className="home-hero plain">
        <div className="home-hero-copy">
          <h1 className="display">An AI engineer that works on a real computer</h1>
          <p className="lead">Forkwise writes the code, runs it, opens the result in a browser and shows it to you. Link your GitHub and Gmail, or let it use your own computer.</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">Start free</Link>
            <Link to="/product" className="btn btn-ghost btn-lg">See how it works</Link>
          </div>
        </div>
        <div className="hero-stage">
          <Frame priority src="/images/shot-chat.webp" alt="Forkwise building a website with the live preview open" />
        </div>
      </section>

      <Section title="One workspace for the whole job" intro="Everything the agent does is visible and can be undone.">
        <FeatureGrid columns={3} items={[
          { icon: ListChecks, title: "See every step", text: "Thinking, files, commands, searches and sub-agents appear as a branching timeline you can open." },
          { icon: FileDiff, title: "Review changes", text: "File tree, line-by-line diffs and a one-click undo for each file." },
          { icon: SquareTerminal, title: "Real terminals", text: "Several shells on the agent's machine, plus background servers you can stop." },
          { icon: MonitorPlay, title: "Live preview", text: "Run sites and apps next to the chat at desktop, tablet and phone widths." },
          { icon: Globe, title: "Browser", text: "It opens real pages, takes screenshots and fixes what looks wrong." },
          { icon: Brain, title: "Memory", text: "It remembers your preferences and writes itself tools it will need again." },
        ]} />
      </Section>

      <Section className="paper" title="Connected to your accounts and your computer" intro="Link several accounts. Sending email and pushing code always ask first.">
        <FeatureGrid columns={4} items={[
          { icon: Github, title: "GitHub", text: "Clone private repositories, open branches and pull requests, read issues.", to: "/docs/github-and-gmail" },
          { icon: Mail, title: "Gmail and Google", text: "Search mail, write drafts, check Drive and Calendar.", to: "/docs/github-and-gmail" },
          { icon: Laptop, title: "Your computer", text: "With the desktop app it uses your terminal, apps, screen, mouse and keyboard.", to: "/download" },
          { icon: Clock, title: "Schedules", text: "Run a task every morning or every week without opening the app.", to: "/docs/schedules-and-secrets" },
        ]} />
      </Section>

      <Section title="Built for control">
        <FeatureGrid columns={3} items={[
          { icon: Bot, title: "Three modes", text: "Auto, ask before every action, or plan first and approve." },
          { icon: Plug, title: "Connectors", text: "Add MCP servers to reach your own tools and data." },
          { icon: Laptop, title: "Granular approvals", text: "Terminal, mouse and keyboard on your computer are approved separately." },
        ]} />
      </Section>

      <CtaBand />
    </>
  )
}
