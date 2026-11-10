export const SITE_URL = "https://forkwiseai.com"

export const HOME_TITLE = "Forkwise: AI Coding Agent That Builds Complete Apps"

export const SEO = {
  "/": {
    title: HOME_TITLE,
    description: "Forkwise is an AI coding agent and AI app builder. Describe what you want and it plans, writes, runs and tests a complete app, website or fix. Start free.",
    h1: "The AI coding agent that builds complete apps",
  },
  "/product": {
    title: "AI Software Engineer With Its Own Computer · Forkwise",
    description: "How the Forkwise AI software engineer works: it plans, writes code, runs and tests it on its own computer or your computer, then checks its work.",
    h1: "An AI software engineer that does the whole job",
  },
  "/use-cases": {
    title: "What You Can Build With an AI App Builder · Forkwise",
    description: "Online stores, SaaS dashboards, booking apps, mobile apps, bots, bug fixes, code reviews and reports: real examples of what people build with Forkwise.",
    h1: "What people build with Forkwise",
  },
  "/pricing": {
    title: "Pricing · Forkwise AI Coding Agent",
    description: "Start free with every feature of the Forkwise AI coding agent. Upgrade for more usage, more models and API keys. Simple monthly or yearly plans.",
    h1: "Simple pricing for an AI engineer",
  },
  "/download": {
    title: "Download Forkwise for Windows, macOS and Linux",
    description: "Download the Forkwise desktop app so the AI coding agent can work in your own folders and terminal, with live output and an emergency stop.",
    h1: "Download Forkwise",
  },
  "/developers": {
    title: "Forkwise API: Run an AI Coding Agent From Your Code",
    description: "Use the Forkwise API to start chats, send coding tasks and stream every step the AI agent takes, from CI, cron jobs or your own product.",
    h1: "The Forkwise API",
  },
  "/security": {
    title: "Security · Forkwise",
    description: "How Forkwise keeps your code, accounts and computer safe: isolated computers, approvals for risky actions, per-site browser permission and encrypted secrets.",
    h1: "Security at Forkwise",
  },
  "/about": {
    title: "About · Forkwise",
    description: "Forkwise builds an AI engineer that does the work and finishes it: real projects, run and tested, not demos.",
    h1: "About Forkwise",
  },
  "/contact": {
    title: "Contact · Forkwise",
    description: "Talk to the Forkwise team about sales, teams, support or partnerships.",
    h1: "Contact Forkwise",
  },
  "/docs": {
    title: "Forkwise Docs: Guides for the AI Coding Agent",
    description: "Guides for every part of Forkwise: your first project, how projects get finished, models, skills, the desktop app and the API.",
    h1: "Forkwise documentation",
  },
  "/blog": {
    title: "Blog · Forkwise",
    description: "Product news, guides and engineering notes on AI coding agents from the Forkwise team.",
    h1: "The Forkwise blog",
  },
  "/changelog": {
    title: "Changelog · Forkwise",
    description: "Every Forkwise release, newest first.",
    h1: "Forkwise changelog",
  },
  "/privacy": {
    title: "Privacy Policy · Forkwise",
    description: "How Forkwise collects, uses and protects your information.",
    h1: "Privacy policy",
  },
  "/terms": {
    title: "Terms of Service · Forkwise",
    description: "The terms for using Forkwise.",
    h1: "Terms of service",
  },
  "/login": {
    title: "Log in · Forkwise",
    description: "Log in to Forkwise, the AI coding agent that builds complete apps.",
    h1: "Log in to Forkwise",
  },
  "/register": {
    title: "Sign up free · Forkwise",
    description: "Create a free Forkwise account and start building apps and websites by chatting with an AI coding agent.",
    h1: "Create your Forkwise account",
  },
}

export function fullTitle(title) {
  if (!title) return HOME_TITLE
  if (title.indexOf("Forkwise") !== -1) return title
  return title + " · Forkwise"
}
