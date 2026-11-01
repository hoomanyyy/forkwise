export const POSTS = [
  {
    slug: "introducing-forkwise-2",
    title: "Introducing Forkwise 2.0: an engineer with its own computer",
    summary: "Forkwise is now a chat that does the work: it builds, runs, checks, remembers and grows new abilities.",
    date: "November 1, 2026",
    tag: "Product",
    minutes: 5,
    colors: ["#6e5cff", "#1fa2ec"],
    body: `Today we are releasing Forkwise 2.0. It is a new product, built from scratch.

## What changed

Forkwise started as a tool that sent one data question to many AI analysts and showed whether the answer held up. People liked the honesty, but most of what they asked us for was bigger: "can it just build the dashboard?", "can it fix my site?", "can it check today's prices?".

So we built that. Forkwise 2.0 is a chat assistant with a private Linux computer. When a request needs real work, it writes the code, runs it, opens the result in a real browser, fixes what is wrong and shows you the live result next to the chat.

## One chat for everything

You don't pick a mode or open a project first. Forkwise reads each message and decides:

- "Hi" gets an answer.
- "What's the dollar rate?" gets a web search and sources.
- "Remember my number is 7" goes to memory.
- "Build me a booking site" gets a running site.

## It grows

The part we are proudest of: Forkwise can write tools for itself. When it needs something it will use again, it writes a small program, tests it, and keeps it for every later chat.

## You stay in control

Choose Auto, Ask first or Plan. Every message is a checkpoint you can go back to, files included.

## Try it

Forkwise is free to start. [Create an account](/register) and send one sentence.`,
  },
  {
    slug: "how-forkwise-decides",
    title: "Why \"hello\" should never start a project",
    summary: "How Forkwise picks between answering, researching, remembering and building.",
    date: "November 1, 2026",
    tag: "Engineering",
    minutes: 4,
    colors: ["#11132e", "#6e5cff"],
    body: `Many coding agents treat every message as a task. Say hello and a workspace spins up, files appear, and a plan is written for nothing.

## Decide first, then act

Forkwise has one rule at the top of its instructions: decide what the message needs before touching anything. Small talk and knowledge questions are answered directly. Anything about the current world goes to the web first. Lasting facts go to memory. Only real work uses the computer.

## The computer is lazy on purpose

A chat's computer does not exist until the first tool needs it. That keeps simple chats fast and cheap, and means a greeting really is just a greeting.

## Current facts come from sources

Prices, exchange rates, versions and news change daily. Forkwise never guesses them. It searches, opens the best pages and replies with the numbers, the time they are from and the links.

## Finishing matters as much as starting

For real tasks the opposite rule applies: keep going until the work is built and verified. Forkwise keeps a task list, and if it tries to stop while items are open, it is reminded to finish them.`,
  },
  {
    slug: "tools-that-build-tools",
    title: "An assistant that writes its own tools",
    summary: "How Forkwise turns a one-off script into a permanent ability.",
    date: "November 1, 2026",
    tag: "Product",
    minutes: 4,
    colors: ["#8b7bff", "#16a34a"],
    body: `Every assistant has a fixed list of tools. Forkwise has a list that grows.

## How it works

When Forkwise needs a capability it will use again, it calls \`create_tool\` with a name, a description, the inputs it expects, and a short Python program. Forkwise saves it, runs a test, and from that moment it can call the tool as \`my_<name>\`, in this chat and every later one.

## An example

Ask "make yourself a tool for the gold price". Forkwise finds a free data source, writes a program that reads it, tests it, and keeps it. Next week, "what is gold doing today?" uses the tool directly.

## Skills for procedures

Some knowledge is a procedure rather than code: how to publish to your blog, how your team names branches. Forkwise saves these as skills and loads them when a job fits.

## You decide what stays

Everything Forkwise makes appears under Abilities. Read the code, turn a tool off, or delete it.`,
  },
  {
    slug: "from-many-analysts-to-one-engineer",
    title: "From many analysts to one engineer",
    summary: "The story of Forkwise, from a student research project to version 2.0.",
    date: "November 1, 2026",
    tag: "Company",
    minutes: 3,
    colors: ["#1fa2ec", "#11132e"],
    body: `Forkwise began as a student project for A-ISPC 2026, built around one idea from research: give the same data to many analysts and they reach different answers.

## Version one

The first Forkwise sent a data question to many AI analysts, each making its own reasonable choices. Python ran every analysis, and a judge said whether the finding was robust, fragile or depended on the choices. The name comes from there: many forks, one honest answer.

## What we learned

The people who used it wanted more than a verdict. They wanted the dashboard built, the data cleaned, the report written, and then their website fixed too.

## Version two

So Forkwise became an engineer. It still checks its own work, now by running the code, opening the result in a browser and fixing what it finds. The logo still shows the idea: paths that branch out and come back to one verified result.`,
  },
]

export const RELEASES = [
  {
    version: "2.0",
    date: "November 1, 2026",
    title: "A new Forkwise",
    items: [
      ["new", "Chat with a private Linux computer for every conversation"],
      ["new", "Live preview of web apps with desktop, tablet and phone sizes"],
      ["new", "Files panel with a full code editor, Changes panel with diffs, and a live terminal"],
      ["new", "Long term memory across chats"],
      ["new", "Forkwise writes its own tools and saves skills"],
      ["new", "Auto, Ask first and Plan modes, with checkpoints for every message"],
      ["new", "Projects with shared files, instructions and memories"],
      ["new", "Web search with sources and a real browser for pages that need JavaScript"],
      ["new", "Helper agents for big searches and research"],
      ["new", "MCP connectors, project hooks and slash commands"],
      ["better", "Answers in the language you write in, including Persian"],
    ],
  },
  {
    version: "1.x",
    date: "Earlier in 2026",
    title: "Many analysts, one honest answer",
    items: [
      ["new", "Multiverse analysis: one data question sent to many AI analysts"],
      ["new", "Specification curve, correlation chart and data explorer"],
      ["new", "Verdicts: robust, fragile, choice dependent or no effect"],
    ],
  },
]

export const LEGAL = {
  privacy: {
    title: "Privacy policy",
    updated: "November 1, 2026",
    body: `This policy explains what Forkwise collects, why, and what you can do about it.

## What we collect

- **Account details**: your name, email address and a secure hash of your password.
- **Your content**: the messages you send, the files you upload, and the files Forkwise creates for you.
- **Memories, tools and skills** that you or Forkwise save to your account.
- **Usage**: how much you use the service each day, so we can apply limits and plans.
- **Technical data**: basic server logs such as IP address and request times, kept for security.

## How we use it

We use your data to run the service: to answer you, run your projects, remember what you asked us to remember, and keep the service secure. We do not sell your data.

## AI model providers

To answer you, your messages and relevant files are sent to the AI model provider that runs the model you chose. Their handling of data is covered by their own terms.

## Where it is stored

Your account data and project files are stored on our servers. Each workspace runs in an isolated container.

## Your choices

- See and delete memories in Settings.
- Delete chats and projects, which removes their files.
- Ask us to delete your account by writing to us through the [contact page](/contact).

## Changes

If we change this policy in a meaningful way, we will tell you in the app.`,
  },
  terms: {
    title: "Terms of service",
    updated: "November 1, 2026",
    body: `By using Forkwise you agree to these terms.

## Your account

Keep your password safe. You are responsible for what happens in your account.

## Acceptable use

Do not use Forkwise to break the law, harm others, attack systems, send spam, or create malware. Do not try to break out of the sandbox or reach other users' data. We may suspend accounts that do.

## Your content

You own what you put in and what Forkwise makes for you. You give us permission to process it only to provide the service.

## AI output

Forkwise can make mistakes. Check important results, especially code, numbers, legal and financial information, before you rely on them.

## Plans and limits

Free and paid plans have usage limits. We may change plans and prices with notice.

## Availability

We work to keep Forkwise available but cannot promise it will never be interrupted. Back up important files by downloading them.

## Ending

You can stop using Forkwise at any time. We may end access for accounts that break these terms.

## Contact

Questions about these terms? [Write to us](/contact).`,
  },
}
