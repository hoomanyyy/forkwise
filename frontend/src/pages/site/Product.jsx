import { Link } from "react-router-dom"
import { Brain, FileDiff, FolderTree, Github, Globe, Laptop, ListChecks, Map as MapIcon, MonitorPlay, SquareTerminal, Zap, Hand, Clock, KeyRound, Download as DownloadIcon } from "lucide-react"
import { CtaBand, FeatureGrid, Frame, PageHero, Section, SplitFeature, usePageTitle } from "../../components/site/parts"

export function Product() {
  usePageTitle("Product", "A workspace where an AI agent writes code, runs it, browses, uses your GitHub and Gmail and controls your computer, with every step visible.")
  return (
    <>
      <PageHero
        kicker="Product"
        title="An agent with a computer, and a dashboard to match."
        lead="Forkwise answers questions, researches the web and builds real software on its own machine. You watch every step, approve what matters and undo anything."
        actions={<><Link to="/register" className="btn btn-primary btn-lg">Start free</Link><Link to="/pricing" className="btn btn-ghost btn-lg">See pricing</Link></>}
        art={<Frame src="/images/shot-home.webp" alt="The Forkwise new chat screen" />}
      />

      <Section id="workspace" title="The workspace" intro="Eight views of the same task, next to the chat.">
        <FeatureGrid columns={4} items={[
          { icon: ListChecks, title: "Activity", text: "Every action with counts, filters and a jump to the file it changed." },
          { icon: MonitorPlay, title: "Preview", text: "Running apps at desktop, tablet and phone widths." },
          { icon: Globe, title: "Browser", text: "Screenshots of every page the agent opened." },
          { icon: Laptop, title: "Computer", text: "Your screen and a log of what it did on your machine." },
          { icon: FolderTree, title: "Files", text: "A project tree with a full code editor and zip download." },
          { icon: FileDiff, title: "Changes", text: "Grouped diffs with line counts and per-file undo." },
          { icon: SquareTerminal, title: "Terminal", text: "Several shells and the background processes you can stop." },
          { icon: Brain, title: "Plan", text: "The agent's task list and long-running jobs with their logs." },
        ]} />
      </Section>

      <Section className="paper" title="A timeline that is not a straight line">
        <SplitFeature
          title="Steps group and branch"
          text="Reading ten files is one step, not ten lines. Tools that run in parallel branch side by side, and helper agents open as their own tree. Open any node to see the command, the diff or the screenshot."
          points={["Groups for reading, editing, commands, browsing and your computer", "Parallel calls shown as branches", "A status bar with the current step, time, changed files and context use"]}
          image="/images/shot-plan.webp"
        />
      </Section>

      <Section id="connections" title="Your accounts and your computer">
        <FeatureGrid columns={3} items={[
          { icon: Github, title: "GitHub, several accounts", text: "Sign in or paste a token. Clone private repos, branch, commit, push and open pull requests." },
          { icon: Globe, title: "Gmail, Drive and Calendar", text: "Choose what it may use per account. Sending mail always asks first." },
          { icon: KeyRound, title: "Secrets", text: "Store API keys once. They reach commands as environment variables and never appear in chats or logs." },
          { icon: Clock, title: "Schedules", text: "Run a prompt hourly, daily, on weekdays or weekly. Each run is a chat you can read." },
          { icon: Laptop, title: "Desktop app", text: "A small app links your computer. The agent uses the terminal, opens apps, changes settings and the wallpaper, and uses the mouse and keyboard." },
          { icon: DownloadIcon, title: "You stay in charge", text: "Computer actions ask first. Shell commands and mouse or keyboard input are approved separately, and Ctrl+C in the app stops everything." },
        ]} />
      </Section>

      <Section className="paper" title="Choose how independent it is">
        <FeatureGrid columns={3} items={[
          { icon: Zap, title: "Auto", text: "Works from start to finish and checks its own result." },
          { icon: Hand, title: "Ask first", text: "Shows each action with its details and waits for you." },
          { icon: MapIcon, title: "Plan", text: "Researches and writes a plan. Nothing changes until you approve." },
        ]} />
        <p className="muted center-text" style={{ marginTop: 18 }}>Every message is a checkpoint. Go back to it and the files go back too.</p>
      </Section>
      <CtaBand />
    </>
  )
}

const RELEASES = "https://github.com/hoomanyyy/forkwise/releases"

const DOWNLOADS = [
  { os: "Windows", file: "forkwise-desktop-windows.exe", note: "Windows 10 or newer" },
  { os: "macOS", file: "forkwise-desktop-macos", note: "macOS 12 or newer. Allow screen recording and accessibility when asked." },
  { os: "Linux", file: "forkwise-desktop-linux", note: "A desktop session with X11" },
]

export function Download() {
  usePageTitle("Download", "The Forkwise desktop app lets the agent use your own computer: terminal, apps, browser tabs, screen, mouse and keyboard.")
  return (
    <>
      <PageHero
        kicker="Desktop app"
        title="Let it use your computer."
        lead="A small app links your Windows, macOS or Linux machine to your Forkwise account. Then the agent can run a full terminal, open VS Code or Windows settings, work in browser tabs, change the wallpaper and use the mouse and keyboard while you step away."
        actions={<Link to="/app/settings/computer" className="btn btn-primary btn-lg">Link a computer</Link>}
      />
      <Section title="Download">
        <div className="download-grid">
          {DOWNLOADS.map((item) => (
            <a key={item.os} className="download-card" href={RELEASES + "/latest/download/" + item.file}>
              <strong>{item.os}</strong>
              <span>{item.note}</span>
              <span className="btn btn-primary btn-sm">Download</span>
            </a>
          ))}
        </div>
        <p className="muted small download-note">Open the app and paste your device token from Settings, Your computer. The builds are not code-signed yet, so Windows SmartScreen and macOS Gatekeeper may ask you to confirm. Other builds and older versions are on the <a href={RELEASES}>releases page</a>. Prefer to read the code first? Settings, Your computer also gives a one-line command that runs the same app from source with Python 3.</p>
      </Section>
      <Section title="How it works">
        <FeatureGrid columns={3} items={[
          { title: "1. Pair", text: "In Settings, choose Your computer and press Link a computer. You get a one-time token." },
          { title: "2. Run", text: "Open the app and paste the token. A small window shows everything the agent does and has a Pause button." },
          { title: "3. Ask", text: "In any chat, ask for something on your computer. Each action asks for your approval unless you allowed it." },
        ]} />
      </Section>
      <Section className="paper" title="What it can do">
        <FeatureGrid columns={4} items={[
          { title: "Terminal", text: "PowerShell on Windows, your login shell elsewhere." },
          { title: "Browser tabs", text: "Opens its own browser window, creates and switches tabs, reads pages and clicks by element number." },
          { title: "Apps and settings", text: "Open VS Code, Notepad, folders, links and ms-settings pages." },
          { title: "App controls", text: "On Windows it reads the buttons and fields of the window in front, then clicks them." },
          { title: "Screen", text: "Screenshots, window list, switching windows, clipboard." },
          { title: "Mouse and keyboard", text: "Click, drag, scroll, type and press shortcuts." },
          { title: "Files", text: "List, read and write files." },
          { title: "Wallpaper", text: "Set it from an image on your disk or a link." },
        ]} />
      </Section>
      <Section title="You stay in control">
        <FeatureGrid columns={3} items={[
          { title: "Approvals", text: "Actions that change something ask you first. Reading a page or the screen does not." },
          { title: "Pause and stop", text: "Pause from the app window, or move the mouse into a screen corner to stop at once." },
          { title: "Separate browser", text: "The agent uses its own browser profile, not your everyday one, so your sign-ins stay private." },
        ]} />
      </Section>
      <CtaBand />
    </>
  )
}
