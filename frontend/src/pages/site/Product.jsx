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
  { os: "Windows", file: "forkwise-desktop-windows.exe", note: "Windows 10 or newer. Installer." },
  { os: "macOS", file: "forkwise-desktop-macos-arm64.dmg", note: "macOS 12 or newer, Apple silicon. Allow screen recording and accessibility when asked." },
  { os: "Linux", file: "forkwise-desktop-linux.AppImage", note: "AppImage. Screen and mouse control need an X11 session." },
]

export function Download() {
  usePageTitle("Download", "The Forkwise desktop app: all of Forkwise in its own window, working on the folders of your own computer, with a real browser, terminal, screen and keyboard.")
  return (
    <>
      <PageHero
        kicker="Desktop app"
        title="Forkwise, on your own computer."
        lead="Open a project folder and the agent reads, edits and tests your real files and runs commands in your own terminal, like Claude Code or Cursor. It also has a built-in browser with tabs and can use the screen, mouse and keyboard. All in one app for Windows, macOS and Linux."
        actions={<a href={RELEASES + "/latest"} className="btn btn-primary btn-lg">All downloads</a>}
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
        <p className="muted small download-note">Install, open the app and sign in. It links this computer to your account by itself, no token to paste. The builds are not code-signed yet, so Windows SmartScreen and macOS Gatekeeper may ask you to confirm the first run. Older versions and other builds are on the <a href={RELEASES}>releases page</a>.</p>
      </Section>
      <Section title="How it works">
        <FeatureGrid columns={3} items={[
          { title: "1. Sign in", text: "The app opens Forkwise in its own window. The first time you sign in, it links this computer to your account automatically." },
          { title: "2. Open a folder", text: "On the new chat page choose Work in a folder on this computer. The agent can only touch files inside that folder." },
          { title: "3. Ask", text: "Describe the change. It searches, reads, edits and runs your tests and dev server on your machine and shows each step. Edits and commands ask you first by default." },
        ]} />
      </Section>
      <Section className="paper" title="What it can do">
        <FeatureGrid columns={4} items={[
          { title: "Your code, in place", text: "Read, search, edit and create files in your project folder. CRLF files stay CRLF." },
          { title: "Your terminal", text: "Runs commands in PowerShell on Windows or your login shell elsewhere, including dev servers in the background." },
          { title: "Built-in browser", text: "Tabs, reading pages, clicking by element number and screenshots. Open your app on localhost to test it." },
          { title: "Your Chrome", text: "Optionally drive a separate Chrome profile when a site needs it." },
          { title: "Screen", text: "Screenshots, window list, switching windows, clipboard." },
          { title: "Mouse and keyboard", text: "Click, drag, scroll, type and press shortcuts." },
          { title: "Apps and settings", text: "Open VS Code, folders, links and system settings pages." },
          { title: "App controls", text: "On Windows it reads the buttons and fields of the window in front, then clicks them." },
        ]} />
      </Section>
      <Section title="You stay in control">
        <FeatureGrid columns={3} items={[
          { title: "Approvals", text: "Chats on your folders start in Ask mode: file changes and commands wait for your approval. Switch to Auto when you trust a task." },
          { title: "Only the folders you pick", text: "The app accepts file and command requests only for folders you chose in its own folder dialog, and never outside them." },
          { title: "Emergency stop", text: "Press Ctrl+Alt+Shift+X (Cmd on macOS) anywhere to pause the agent and stop running commands at once." },
        ]} />
      </Section>
      <CtaBand />
    </>
  )
}
