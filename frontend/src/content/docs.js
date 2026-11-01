export const DOC_GROUPS = [
  { title: "Start here", slugs: ["getting-started", "how-forkwise-decides"] },
  { title: "Working with Forkwise", slugs: ["the-computer", "modes-and-checkpoints", "projects", "files-and-uploads"] },
  { title: "Make it yours", slugs: ["memory", "abilities", "connectors", "project-settings"] },
  { title: "Run it yourself", slugs: ["self-hosting"] },
]

export const DOCS = {
  "getting-started": {
    title: "Getting started",
    summary: "Create an account, send your first message and see Forkwise work.",
    body: `Forkwise is a chat assistant with its own computer. This page takes you from a new account to your first finished project.

## Create your account

Open [Start free](/register), enter your name, email and a password. The first screen you see is the new chat page.

## Send your first message

Type anything in the box and press Enter. Try one of these to see the three kinds of work:

- \`Hi!\` gets a short, normal answer.
- \`What is the US dollar rate today?\` makes Forkwise search the web and answer with sources.
- \`Build a landing page for a coffee shop and show it to me\` turns on the computer and builds a real site.

## Watch it work

When Forkwise uses its computer, each step appears in the chat as a small line: a file it wrote, a command it ran, a page it opened. Click a line to see the details, such as the code change or the command output.

The **Plan** box above the message box shows its task list and progress. When it starts a website, the **Preview** panel opens on the right.

## Keep talking

Ask for changes in plain words: "make the header darker", "add a contact form", "use Persian for all text". You can send a message while it is working; it reads it at the next step.

## Next steps

- Learn [how Forkwise decides](/docs/how-forkwise-decides) what each message needs.
- Explore [the computer](/docs/the-computer) panel.
- Choose a [mode](/docs/modes-and-checkpoints) for how independently it works.`,
  },
  "how-forkwise-decides": {
    title: "How Forkwise decides",
    summary: "Why \"hello\" gets an answer and \"build a site\" gets a site.",
    body: `Forkwise reads every message and picks the kind of work it needs. You never have to switch modes or open a project first.

## Four kinds of requests

| You say | Forkwise does |
|---|---|
| A greeting, thanks or small talk | Answers in text. No files, no computer. |
| A question it can answer from knowledge | Explains it directly. |
| Anything about the current world: prices, rates, news, versions | Searches the web, reads the best sources, answers with numbers and links. |
| Make, change, run or analyse something | Uses its computer until the job is done and checked. |

## Remembering

"Remember that my company is called RHINOREL" saves a fact to [memory](/docs/memory). Forkwise never writes such facts into files.

## Finishing the job

For real work, Forkwise keeps going until the result is built, running and verified. It writes a task list, runs what it builds, opens sites in a real browser and fixes errors. It only asks you when a decision truly belongs to you, such as a brand name.

> Tip: if Forkwise misunderstood, just say so. "No, I only wanted the answer, not a file" works.`,
  },
  "the-computer": {
    title: "The computer",
    summary: "Preview, Files, Changes and Terminal in the panel next to the chat.",
    body: `Every chat has a private Linux computer with Python, Node.js, git, ffmpeg, ImageMagick and a real Chromium browser. Open the panel with the button in the top right of a chat.

## Preview

Web apps that Forkwise starts appear here while it works. Switch between desktop, tablet and phone widths, reload, or open the preview in a new tab.

## Files

Browse every file in the project. Click a file to open it in a full code editor, change it and press **Save** or Ctrl+S. Download single files or the whole project as a zip.

## Changes

See exactly what changed during the last task, file by file, with added and removed lines.

## Terminal

A real shell on the same computer. Run commands, check logs and see background jobs such as running servers, which you can stop with one click.

## What the computer can do

- Install packages with pip and npm.
- Reach the internet to download data and call APIs.
- Run servers and keep them running in the background.
- Take screenshots of pages and read console errors.

The computer goes to sleep after a while without use. Your files stay; Forkwise restarts servers when needed.`,
  },
  "modes-and-checkpoints": {
    title: "Modes and checkpoints",
    summary: "Choose how much Forkwise does alone, and undo anything.",
    body: `Pick a mode from the menu under the message box, or press Shift+Tab to switch.

## Auto

Forkwise works from start to finish on its own and checks its result. Best for most tasks.

## Ask first

Before Forkwise changes a file or runs a command, it shows what it wants to do and waits. Choose **Allow**, **Allow for this chat**, or **Deny** with a note about what to do instead.

## Plan

Forkwise only reads, searches and researches, then writes a complete plan. Review it and press **Approve and build** to switch to Auto and start, or **Keep planning** to change it.

## Checkpoints

Every message you send is a checkpoint. Hover over one of your messages and press the history button to go back to it. Later messages are removed, the files return to how they were, and your message comes back to the box so you can change it.

## Slash commands

| Command | What it does |
|---|---|
| \`/plan\`, \`/auto\`, \`/ask\` | Switch the mode |
| \`/init\` | Write a FORKWISE.md file with notes about the project |
| \`/compact\` | Summarize the chat to free up space |
| \`/new\` | Start a new chat |
| \`/memory\` | Open your memories |
| \`/abilities\` | Open tools and skills |`,
  },
  projects: {
    title: "Projects",
    summary: "Group chats that share files, instructions and memories.",
    body: `A project is a folder of work with its own files, instructions and memories. Every chat in the project uses the same computer folder, so a new chat can continue where the last one stopped.

## Create a project

Open **Projects** in the sidebar and press **New project**. Give it a name and a short description.

## Instructions

Write instructions that apply to every chat in the project, such as brand colors, the stack, or the tone of the copy. Forkwise reads them before every answer.

## FORKWISE.md

For bigger projects, Forkwise keeps a file called \`FORKWISE.md\` in the project folder with what the project is, how to run it and what is left. It reads this file at the start of every message. Type \`/init\` to create it.

## Project memories

Ask Forkwise to remember something "for this project" and the memory only applies inside it.`,
  },
  "files-and-uploads": {
    title: "Files and uploads",
    summary: "Attach files, get results back, download everything.",
    body: `## Attach files

Press the paperclip, drag files onto the message box, or paste images. Files are saved in the \`uploads\` folder of the chat or project. Images are shown to the model when it supports images.

## Results

When Forkwise makes something you will want, such as a video, a PDF or a spreadsheet, it shows it as a card with a preview and a **Download** button.

## Download everything

Use the download button in the chat header, or the zip button in the Files panel, to get the whole project.

## Limits

Each upload can be up to the size set by the server, 200 MB by default.`,
  },
  memory: {
    title: "Memory",
    summary: "What Forkwise remembers about you, and how to change it.",
    body: `Forkwise has long term memory that works in every chat.

## Saving

Say "remember …" and Forkwise saves a short fact, such as "my favourite number is 7" or "my site uses British English". It also saves lasting preferences you mention.

## Using

Saved memories are part of what Forkwise knows before it answers. Ask "what is my favourite number?" in a new chat and it knows.

## Forgetting

Say "forget …", or open **Settings → Memory** and delete it. You can also add memories there yourself.

## Instructions for every chat

For rules about how Forkwise should work with you, use **Settings → General → Instructions for every chat**.`,
  },
  abilities: {
    title: "Abilities: tools and skills",
    summary: "Forkwise can write tools for itself and keep them.",
    body: `When Forkwise needs a capability it will use again, it can give itself a new permanent tool.

## Tools

A tool is a small Python program with a name, a description and inputs. Forkwise writes it, tests it, and from then on can call it as \`my_<name>\` in any chat. Examples: a live price checker, a converter, a client for an API you use.

Ask directly: "make yourself a tool that checks the gold price". Or let Forkwise decide when a tool would help.

## Skills

A skill is a saved procedure in plain words, such as how to publish a post to your blog. Forkwise lists your skills and loads one when it fits the job.

## Managing

Open **Abilities** in the sidebar to see every tool and skill, read its code or instructions, turn it off or delete it.`,
  },
  connectors: {
    title: "Connectors (MCP)",
    summary: "Give Forkwise access to your other apps.",
    body: `Forkwise speaks the Model Context Protocol (MCP). Any MCP server reachable over HTTP can add tools.

## Add a connector

Open **Settings → Connectors**, enter a name, the server link and an access token if it needs one, and press **Connect**. Forkwise checks the connection and lists the tools it found.

## Using connector tools

Connector tools appear in every chat. Ask for what you need in plain words; Forkwise picks the right tool.

## Removing

Delete a connector in the same place. Its tools disappear from the next message on.`,
  },
  "project-settings": {
    title: "Project settings and hooks",
    summary: "Run commands automatically and block risky ones.",
    body: `Put a file at \`.forkwise/settings.json\` inside a project to control how Forkwise works there.

\`\`\`json
{
  "hooks": {
    "after_edit": "npx prettier --write {file}",
    "after_turn": "npm test"
  },
  "deny": ["rm -rf /", "git push --force"]
}
\`\`\`

## Hooks

- \`after_edit\` runs after every file Forkwise writes or edits. \`{file}\` becomes the file path. Its output goes back to Forkwise, so lint errors get fixed right away.
- \`after_turn\` runs when a task that changed files finishes.

## Blocked commands

Commands that contain any text in \`deny\` are refused.`,
  },
  "self-hosting": {
    title: "Self-hosting",
    summary: "Run your own Forkwise on a Linux server.",
    body: `Forkwise has two parts: the **frontend** (this website and app) and the **backend** (the API on your server).

## Backend

On an Ubuntu server with a domain such as \`api.example.com\`:

\`\`\`bash
git clone https://github.com/your-org/forkwise.git
cd forkwise/backend
sudo LLM_API_KEY=your-key LLM_MODELS="model-id=Label" bash deploy/install.sh --api-domain api.example.com --site https://example.com
\`\`\`

This installs Docker, the sandbox image, a firewall for the sandboxes, the \`forkwise-api\` service and nginx with HTTPS.

## Updates

\`\`\`bash
sudo forkwise-update
\`\`\`

It pulls the newest code, installs new packages only when needed, rebuilds the sandbox only when it changed and restarts the API.

## Frontend

Deploy the \`frontend\` folder to Vercel or Cloudflare Pages with \`VITE_API_URL=https://api.example.com\`.

## Settings

All settings live in \`/opt/forkwise/backend.env\`: models and keys, sandbox limits, email, and the allowed frontend addresses.`,
  },
}

export function docOrder() {
  const order = []
  for (const group of DOC_GROUPS) for (const slug of group.slugs) order.push(slug)
  return order
}
