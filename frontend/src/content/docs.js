export const DOC_GROUPS = [
  { title: "Start here", slugs: ["getting-started", "how-forkwise-decides", "finishing-projects", "choosing-a-model"] },
  { title: "Working with Forkwise", slugs: ["the-computer", "modes-and-checkpoints", "projects", "files-and-uploads"] },
  { title: "Make it yours", slugs: ["skills", "memory", "abilities", "connectors", "project-settings"] },
  { title: "Your computer and browser", slugs: ["desktop-app", "chrome-extension"] },
  { title: "Accounts", slugs: ["github-and-gmail", "schedules-and-secrets"] },
  { title: "Developers", slugs: ["api", "api-events"] },
]

export const DOCS = {
  "finishing-projects": {
    title: "How Forkwise finishes projects",
    summary: "Why you get a real, working project and not a single file demo.",
    body: `Forkwise is built to deliver complete projects. Here is what happens behind the scenes when you ask it to build something.

## It plans first

For anything bigger than a quick script it loads the matching skills (for example **fullstack-app** and **frontend-design**), then plans the user stories, every page, the data model, the API routes and the stack. The pages and features go on the task list you see on the right, so nothing is forgotten.

## It builds like a team

- A router with a pages folder, one file per page, shared components and an API layer on the front end.
- Separate routes, models, schemas, services and database setup on the back end, with settings from environment variables.
- A real database (SQLite unless you ask for another one), real sign up and sign in with hashed passwords, real API calls, uploads and live updates where they make sense.
- Loading, empty and error states on every page.

It builds in slices: one feature end to end, then it runs the build and fixes every error before the next.

## It checks its own work

Before Forkwise may finish, an automatic review looks at what actually happened in the run, not at what the model says:

- Items left on the task list.
- Very large single files that should be split.
- A user interface with only one or two files and no pages.
- An app that was built but never started and opened.
- A last command or build that failed.
- A bigger project without a README.

If anything is found, the agent gets the list and keeps working. You see a short notice, *Checking the work before finishing*, when this happens.

## It does not stop half way

If the model writes "now I will run the server" but does not actually do it, or ends a turn with no answer, Forkwise sends it back to work. If a model is busy or cannot be reached, the next model takes over. If a run still stops, the chat says why and you can send **continue**.

## Getting the best result

- Say who it is for, the pages and features you need, and the language of the site.
- Pick a strong model for big projects. Small free models make more mistakes on long tasks.
- Name the stack if you care about it. If you ask for something that does not fit together, such as "a C# backend with FastAPI", Forkwise picks the sensible reading and tells you.`,
  },
  "choosing-a-model": {
    title: "Choosing a model",
    summary: "Which model to pick for which job, and what happens when one is busy.",
    body: `Open the model picker next to the send button. Models are grouped by maker: Claude, OpenAI, Gemini, DeepSeek, Qwen, Llama, Mistral, Kimi, GLM and more. Use the tabs or type to search; your recent picks are at the top.

## Rules of thumb

| Job | Pick |
| --- | --- |
| Big projects, long builds, refactors | The strongest coding models you have, such as Claude Sonnet or Opus, GPT-5 class, or Qwen3 Coder |
| Quick questions and small scripts | A fast, small model |
| Research and long documents | A model with a large context window |
| Images in your message | A model marked *sees images* |

Free models are great for trying things, but on long agent tasks they make more mistakes, repeat themselves or stop early.

## Thinking level

Under the models you can set how long reasoning models think: Auto, Low, Medium or High. Higher is slower and uses more of your plan, but helps with hard bugs and planning.

## When a model is busy

If a model is rate limited, overloaded or cannot be reached, Forkwise switches to the next available model and tells you in a short notice. The busy model is rested for a few minutes.`,
  },
  skills: {
    title: "Skills",
    summary: "Expert playbooks the agent loads for a task, built in and your own.",
    body: `A skill is a step by step method for one kind of job, written the way a senior engineer works. Forkwise comes with 24 of them, and it can save new ones it learns.

## Using skills

- The agent loads a matching skill by itself when a task fits.
- Add one to your message with **+, Add a skill**, or type **/** in the message box and pick from the list.
- Up to five skills per message. They show as chips on your message.

## Built in skills

**Build:** fullstack-app, frontend-design, large-codebase, plan-big-feature, api-design, database, ai-features, mobile-app, seo-web.

**Quality:** debug-systematically, code-review, tdd, refactor-safely, security-audit, performance, e2e-testing.

**Ship:** git-workflow, deploy, upgrade-dependencies.

**Research:** web-research, data-analysis.

**Documents:** documents (Word, Excel, PowerPoint and PDF), write-docs.

**Browser:** browser-tasks.

## Your own skills

When the agent finds a good procedure it can save it with *save_skill*. You can also ask: "save this as a skill". See and turn off your skills under **Customize, Abilities**. In a project you can also keep skills as files in \`.forkwise/skills/NAME.md\`.`,
  },
  "chrome-extension": {
    title: "Forkwise for Chrome",
    summary: "Let the agent work in your own browser, signed in as you, only on the sites you allow.",
    body: `Some tasks need your accounts: a store admin, an analytics dashboard, a CMS. Forkwise for Chrome lets the agent open tabs in your own Chrome, Edge or Brave, where you are already signed in.

## Set it up

1. Install the [desktop app](/download) and sign in. The extension comes with it.
2. In the app open **Settings, Computer, Your own Chrome** and press **Set up**. It opens the extensions page and copies the extension folder path.
3. Turn on **Developer mode**, press **Load unpacked**, paste the path and choose the folder. The Forkwise button appears in the toolbar.

When it is connected, the app and the website show **Your own Chrome: connected**.

## How it behaves

- The agent works only in tabs of the purple **Forkwise** tab group. It cannot see your other tabs unless you press **Let Forkwise use this tab** in the toolbar popup.
- The first time it wants to use a site, a small window asks: **Allow this time**, **Always allow on this site** or **Don't allow**. Manage always allowed sites in the popup.
- While it controls a tab, Chrome shows a bar that says the tab is being controlled. Press **Cancel** on it, or **Stop now** in the popup, to stop at once. **Pause** blocks everything until you resume.
- It never types passwords, card numbers or one time codes itself, and never buys, sends or deletes without your clear yes.

The desktop app must be open while the extension is in use.`,
  },
  api: {
    title: "API and API keys",
    summary: "Drive Forkwise from your own code: chats, tasks and live events.",
    body: `Everything you do in chats can be done from code with an API key. The base address is \`https://api.forkwiseai.com\`.

## Create a key

Open **Settings, API keys**, give the key a name and press **Create key**. Copy it right away; it is shown only once. Send it in every request:

\`\`\`
Authorization: Bearer fwk_...
\`\`\`

A key can use chats, projects and runs. It cannot read or change your password, email, billing, account settings or other keys. Revoke a key at any time; programs using it stop at once. Usage counts against your plan.

## Start a chat

\`\`\`bash
curl https://api.forkwiseai.com/api/chats \\
  -H "Authorization: Bearer $FORKWISE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "", "mode": "auto"}'
\`\`\`

The answer has \`chat.id\`. Optional fields: \`project_id\`, \`model\` (a key from \`GET /api/auth/me\` models), \`mode\` (\`auto\`, \`ask\` or \`plan\`).

## Give it a task

\`\`\`bash
curl https://api.forkwiseai.com/api/chats/CHAT_ID/messages \\
  -H "Authorization: Bearer $FORKWISE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Build a REST API for a todo app with tests", "skills": ["fullstack-app"]}'
\`\`\`

The answer has \`run_id\`. If a run is already working in that chat, the message is queued and \`queued\` is true.

## Other endpoints

| Method and path | What it does |
| --- | --- |
| GET /api/chats | List your chats |
| GET /api/chats/ID | A chat with all its messages and the last run |
| DELETE /api/chats/ID | Delete a chat |
| GET /api/runs/ID/events | Live events of a run (see [Events](/docs/api-events)) |
| POST /api/runs/ID/stop | Stop a run |
| POST /api/runs/ID/respond | Answer a question or an approval: \`{"id": "CALL_ID", "value": "allow"}\`. For approvals send allow, always or deny; for questions send the answer text |
| GET /api/projects | List projects |
| GET /api/skills | Your skills and the built in ones |

## Errors and limits

Errors come back as JSON with \`detail\`. 401 means a missing or revoked key, 403 an action keys may not do, 404 something that is not yours or does not exist, and 429 that your plan's usage for today is used up.`,
  },
  "api-events": {
    title: "API: live events",
    summary: "Stream every step of a run as server sent events.",
    body: `\`GET /api/runs/RUN_ID/events\` streams a run as server sent events. Each event is a line \`data: {...}\` with JSON. Lines that start with \`:\` keep the connection open; ignore them. If you reconnect, pass \`?after=N\` with the last \`seq\` you saw plus one.

## Event types

| type | Meaning | Fields |
| --- | --- | --- |
| step | A new model turn starts | step |
| text | Answer text as it streams | text |
| reasoning | Thinking text, for models that show it | text |
| tool_start | A tool call begins | id, name, args |
| tool_output | Live output of a running command | id, text |
| tool_end | A tool call finished | id, ok, text |
| assistant | A finished model turn | content, tool_calls |
| todos | The task list changed | todos |
| waiting | The agent needs an answer or an approval | id, kind (approval or question), name, args or the question |
| answered | A waiting call was answered | id, value |
| file | The agent shared a result file | path |
| preview | A live preview started | port, url |
| notice | A short message for the user | text |
| error | The run failed | text |
| done | The run ended | status: done, stopped or error |

## Example in Python

\`\`\`python
import json, os, requests

head = {"Authorization": "Bearer " + os.environ["FORKWISE_KEY"]}
url = "https://api.forkwiseai.com/api/runs/" + run_id + "/events"
with requests.get(url, headers=head, stream=True) as events:
    for line in events.iter_lines():
        if not line.startswith(b"data: "):
            continue
        event = json.loads(line[6:])
        if event["type"] == "text":
            print(event["text"], end="", flush=True)
        if event["type"] == "done":
            break
\`\`\`

When the stream ends, read the whole chat with \`GET /api/chats/CHAT_ID\` for the final messages and files changed.`,
  },
  "github-and-gmail": {
    title: "GitHub and Gmail",
    summary: "Link one or more GitHub and Google accounts and let Forkwise use them.",
    body: `Open **Settings, Connected accounts**.

## GitHub

Press **Sign in with GitHub**, or paste a personal access token. You can link several accounts, give each a label such as Work, and rename or remove them later. Tokens are encrypted on the server and never shown again or given to the model. Clone and push use them for you.

With a GitHub account linked, ask things like "clone my private repo acme/site, fix the failing test and open a pull request". Pushing, opening pull requests and issues, and commenting ask for your approval every time.

## Gmail, Drive and Calendar

Choose the services you want, then press **Link a Google account**. Link a second account the same way. Forkwise can search and read mail, save drafts, look through Drive and handle calendar events, but only for the services you allowed. **Sending an email always asks first.**

## If something fails

If an account shows **Reconnect**, its access was revoked or expired. Remove it and link it again. Google sign-in only works when the server owner has added Google client keys; GitHub tokens work everywhere.`,
  },
  "schedules-and-secrets": {
    title: "Schedules and secrets",
    summary: "Run tasks on a timer and store API keys safely.",
    body: `## Schedules

Open **Settings, Schedules** and press **New schedule**. Write what Forkwise should do, choose hourly, daily, weekdays or weekly, and the time in your time zone. Each run becomes a normal chat you can open later. Use **Run now** to test it.

Scheduled runs happen while you are away, so they never wait for approval. They use only the tools that need no approval and skip anything that does, then say so in their report. You can have up to 20 schedules, and runs count against your daily usage.

## Secrets

Open **Settings, Secrets** and save a value under a name like \`STRIPE_KEY\`. Forkwise passes secrets to its terminal and to commands as environment variables, so a command can read \`$STRIPE_KEY\`. Values are encrypted, cannot be read back, and are not written into files, chats or logs. A secret can apply to every project or to one.`,
  },
  "desktop-app": {
    title: "The desktop app",
    summary: "Forkwise on Windows, macOS and Linux, working in your own folders and terminal.",
    body: `The Forkwise desktop app is the full Forkwise in its own window, plus what a website cannot do: work in the folders of your own computer and run commands in your own terminal. The AI model stays in the cloud; your files stay on your machine.

## Install and sign in

Download the app from the [Download page](/download), install it and sign in. The app links your computer to your account by itself. You never paste a token. The installers are not code signed yet, so Windows SmartScreen or macOS may ask you to confirm the first run.

## Where a chat runs

In the desktop app every new chat runs **on this computer**. The folder is chosen in this order:

1. A folder you name in your message, for example *"work in D:\\projects\\shop"*. The app asks once before it uses a folder it has not seen.
2. The folder you opened with **File, Open folder** or chose with **+ , Work in a folder**.
3. Otherwise \`~/Forkwise\` in your home folder.

You can switch new chats to the cloud sandbox in **Settings, Agent, Run new chats on**. The chip above the message box always shows where a chat runs.

## What the agent can do there

- List, search, read, edit and create files inside the folder, never outside it.
- Run commands in your own shell (PowerShell, cmd, Git Bash or WSL on Windows; zsh or bash elsewhere). Output appears live in the chat while the command runs.
- Start dev servers in the background, read their output and stop them.
- Open \`http://localhost:PORT\` in the built in browser to test what it built.
- Read \`FORKWISE.md\`, \`AGENTS.md\` or \`CLAUDE.md\` in the folder for how to build and test your project.

## The editor and terminals

The app has a full editor (Monaco) with tabs, diffs, search and replace, and type errors for the whole project. Terminals are real shells; choose the shell in **Settings, Terminal**. Code blocks in answers have **Copy** and, for shell commands, **Run**, which opens a terminal in the chat's folder.

## Agent board

Press **Ctrl+Shift+A** for the agent board. Start several agents at once; each can work on its own git branch (a worktree) so they never step on each other. When an agent finishes you can **Review** its changes with a second agent, **Merge** them or **Discard** them.

## Staying in control

- The agent only works in folders you opened or approved.
- Choose in **Settings, Computer** what asks first: file changes, commands, the screen.
- Press **Ctrl+Alt+Shift+X** (Cmd on macOS) anywhere to stop everything at once.
- The computer must be on and the app open while the agent works on it. Keep your project in git; changes on your computer have no automatic undo.`,
  },

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

The task list and progress show in the right panel next to the chat. When it starts a website, the **Preview** panel opens on the right.

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

}

export function docOrder() {
  const order = []
  for (const group of DOC_GROUPS) for (const slug of group.slugs) order.push(slug)
  return order
}
