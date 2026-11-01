import { Link } from "react-router-dom"
import { Brain, FileDiff, FolderTree, Globe, Hand, Map as MapIcon, MessageSquare, MonitorPlay, Plug, SquareTerminal, Wrench, Zap, BookOpen } from "lucide-react"
import { BranchField, CtaBand, FeatureGrid, Frame, PageHero, Section, SplitFeature, Steps, usePageTitle } from "../../components/site/parts"

export function Product() {
  usePageTitle("Product", "One chat that answers questions, researches the web, remembers you and builds real software on its own computer.")
  return (
    <>
      <PageHero
        kicker="Product overview"
        title="One chat. A whole engineering team's toolkit."
        lead="Forkwise is a chat assistant with a private computer. It answers, looks things up, remembers you, and when you ask for something real, it builds it and shows you."
        actions={<><Link to="/register" className="btn btn-brand btn-lg">Start free</Link><Link to="/pricing" className="btn btn-ghost btn-lg">See pricing</Link></>}
        art={<Frame src="/images/shot-home.webp" alt="The Forkwise new chat screen" />}
      />
      <Section className="paper" title="What you can ask for" intro="If a person could do it at a computer, you can probably ask Forkwise.">
        <FeatureGrid columns={4} items={[
          { icon: MessageSquare, title: "Answers", text: "Explanations, writing, translation and advice, straight away." },
          { icon: Globe, title: "Current facts", text: "Prices, rates, news and versions from real sources with links." },
          { icon: MonitorPlay, title: "Sites and apps", text: "Landing pages, shops, dashboards and full stack apps, running live." },
          { icon: FolderTree, title: "Files and data", text: "Clean spreadsheets, build reports, convert and edit media." },
        ]} />
      </Section>
      <Section title="Built to finish the job">
        <SplitFeature title="It runs what it writes" text="Code is only done when it works. Forkwise installs packages, runs the program, reads errors and fixes them, then runs it again." image="/images/shot-chat.webp" points={["Real shell with internet", "Servers that keep running in the background", "Output of every command, visible in the chat"]} />
        <SplitFeature reverse title="It looks at the result" text="For anything with a screen, Forkwise opens a real Chromium browser, takes screenshots at desktop and phone sizes, reads the console and fixes what looks wrong." image="/images/shot-files.webp" points={["Screenshots shown in the chat", "Console errors fixed before it says done", "Mobile layout checked too"]} />
        <SplitFeature title="It tells you what it is doing" text="A live task list, each step as a short line you can open, and a clear summary at the end. Send a message any time; it reads it at the next step." image="/images/shot-plan.webp" points={["Task list with progress", "Every file change as a diff", "Stop, steer or undo at any moment"]} />
      </Section>
      <Section className="paper" title="The parts of Forkwise">
        <FeatureGrid items={[
          { icon: MonitorPlay, title: "The computer", text: "Preview, files, changes and terminal.", to: "/product/computer" },
          { icon: Brain, title: "Memory and abilities", text: "It remembers you and grows new tools.", to: "/product/abilities" },
          { icon: MapIcon, title: "Plan and control", text: "Choose how independently it works.", to: "/product/control" },
        ]} />
      </Section>
      <CtaBand />
    </>
  )
}

export function Computer() {
  usePageTitle("The computer", "Every Forkwise chat has a private Linux computer with live preview, a code editor, diffs and a terminal.")
  return (
    <>
      <PageHero
        kicker="The computer"
        title="A real computer, right next to the chat."
        lead="Every chat gets a private Linux machine with Python, Node.js, git, ffmpeg, ImageMagick and a real browser. Watch it work, or take the keyboard yourself."
        actions={<Link to="/register" className="btn btn-brand btn-lg">Try it free</Link>}
        art={<Frame src="/images/shot-chat.webp" alt="Forkwise with the live preview panel open" />}
      />
      <Section className="paper" title="Four panels, one workspace">
        <FeatureGrid columns={4} items={[
          { icon: MonitorPlay, title: "Preview", text: "Running apps at desktop, tablet and phone widths. Open in a new tab any time." },
          { icon: FolderTree, title: "Files", text: "The whole project in a tree, with a full code editor and zip download." },
          { icon: FileDiff, title: "Changes", text: "What the last task changed, file by file, line by line." },
          { icon: SquareTerminal, title: "Terminal", text: "A live shell on the same machine, plus running jobs you can stop." },
        ]} />
      </Section>
      <Section>
        <SplitFeature title="Edit alongside Forkwise" text="Open any file in the editor, change it and save. Forkwise sees your edits in the next message, so you can fix a word yourself and let it handle the rest." image="/images/shot-files.webp" />
        <SplitFeature reverse title="Review every change" text="The Changes panel compares each file to how it was before the task. Added lines in green, removed in red. Not happy? Go back to the message and the files return." image="/images/shot-changes.webp" />
      </Section>
      <Section className="band-dark" title="What is installed" intro="Ready for most jobs, and Forkwise installs anything else it needs with pip or npm.">
        <div className="feature-grid cols-4">
          {[["Languages", "Python 3, Node.js 22, bash"], ["Web", "Vite, React, FastAPI, Flask, serve"], ["Data", "pandas, numpy, matplotlib, openpyxl, sqlite"], ["Media", "ffmpeg, ImageMagick, Pillow, yt-dlp"], ["Documents", "python-docx, reportlab, pypdf"], ["Browser", "Chromium with Playwright"], ["Tools", "git, ripgrep, jq, curl, zip"], ["Network", "Internet access for packages and APIs"]].map((item) => (
            <div className="feature" key={item[0]}><h3>{item[0]}</h3><p>{item[1]}</p></div>
          ))}
        </div>
      </Section>
      <Section title="Safe by design" intro="Each workspace is a locked container: its own files, no access to other users, limited memory and processes, and no way into the server's private network.">
        <Link to="/security" className="btn btn-ghost">Read about security</Link>
      </Section>
      <CtaBand />
    </>
  )
}

export function Abilities() {
  usePageTitle("Memory and abilities", "Forkwise remembers what matters to you and writes permanent tools for itself.")
  return (
    <>
      <PageHero
        kicker="Memory and abilities"
        title="It remembers you. It learns new tricks."
        lead="Forkwise keeps what you tell it across every chat, and when it needs a capability again, it writes itself a tool and keeps it."
        actions={<Link to="/register" className="btn btn-brand btn-lg">Start free</Link>}
        art={<Frame src="/images/shot-abilities.webp" alt="The abilities page with tools Forkwise created" />}
      />
      <Section className="paper">
        <SplitFeature title="Memory that you control" text="Say &quot;remember that my site uses British English&quot; and it does, in every chat. Say &quot;forget it&quot; and it is gone. Every memory is listed in Settings." points={["Facts and preferences, never stored in random files", "Project memories that apply only inside a project", "Add, read and delete memories yourself"]}>
          <pre className="code-card" dir="ltr">
            <span className="c-dim">you</span>      remember my favourite number is 7{"\n"}
            <span className="c-key">memory</span>   saved  <span className="c-str">"Favourite number is 7"</span>{"\n\n"}
            <span className="c-dim">— a new chat, a week later —</span>{"\n\n"}
            <span className="c-dim">you</span>      what's my favourite number?{"\n"}
            <span className="c-key">forkwise</span> <span className="c-str">7.</span>
          </pre>
        </SplitFeature>
      </Section>
      <Section title="Abilities it builds for itself">
        <Steps items={[
          { title: "Notices a need", text: "A job needs something Forkwise will want again, like a price feed." },
          { title: "Writes a tool", text: "A small Python program with a clear name, description and inputs." },
          { title: "Tests it", text: "Runs it right away and fixes it until the test passes." },
          { title: "Keeps it", text: "The tool is available as my_name in every chat from now on." },
        ]} />
      </Section>
      <Section className="paper">
        <FeatureGrid items={[
          { icon: Wrench, title: "Tools", text: "Programs Forkwise wrote. Read the code, turn them off, or delete them." },
          { icon: BookOpen, title: "Skills", text: "Saved procedures in plain words, loaded when a job fits." },
          { icon: Plug, title: "Connectors", text: "Your own MCP servers add even more tools." },
        ]} />
      </Section>
      <CtaBand />
    </>
  )
}

export function Control() {
  usePageTitle("Plan and control", "Choose Auto, Ask first or Plan, and undo anything with checkpoints.")
  return (
    <>
      <PageHero
        kicker="Plan and control"
        title="You decide how much it does alone."
        lead="Let it run, approve each action, or ask for a plan first. Whatever you choose, every message is a checkpoint you can go back to."
        actions={<Link to="/register" className="btn btn-brand btn-lg">Start free</Link>}
        art={<Frame src="/images/shot-plan.webp" alt="A plan waiting for approval" />}
      />
      <Section className="paper" title="Three modes">
        <FeatureGrid items={[
          { icon: Zap, title: "Auto", text: "Works from start to finish and verifies its own result. Best for most tasks." },
          { icon: Hand, title: "Ask first", text: "Shows each change or command and waits for Allow, Allow for this chat, or Deny." },
          { icon: MapIcon, title: "Plan", text: "Reads and researches only, then presents a plan. Approve it to start building." },
        ]} />
      </Section>
      <Section>
        <SplitFeature title="Checkpoints for every message" text="Went in the wrong direction? Go back to any of your messages. Later messages are removed, files return to how they were, and your message is back in the box to edit." points={["Automatic, no setup", "Files and conversation restored together", "Works in every mode"]}>
          <div className="code-card" dir="ltr">
            <span className="c-key">checkpoint</span> before "add a dark theme"{"\n"}
            <span className="c-dim">  12 files</span>{"\n"}
            <span className="c-key">checkpoint</span> before "translate to Persian"{"\n"}
            <span className="c-dim">  14 files</span>{"\n"}
            <span className="c-key">restore</span>    back to "add a dark theme"{"\n"}
            <span className="c-str">  files restored, chat rewound</span>
          </div>
        </SplitFeature>
        <SplitFeature reverse title="Steer while it works" text="Send a message in the middle of a task. Forkwise reads it at the next step and adjusts. Press stop to end the task at once." points={["Messages queue while it works", "Stop at any moment", "Slash commands for quick actions"]} image="/images/shot-chat.webp" />
      </Section>
      <Section className="band-dark" title="Project rules" intro="Add a settings file to a project to run a formatter after every edit, run tests after every task, or block commands you never want to run.">
        <Link to="/docs/project-settings" className="btn btn-primary">Read the guide</Link>
      </Section>
      <CtaBand />
    </>
  )
}
