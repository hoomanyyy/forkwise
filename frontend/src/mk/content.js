import { BarChart3, Bot, Bug, FileText, GitPullRequest, Globe, LayoutDashboard, MessagesSquare, Search, ShoppingBag, Smartphone, Workflow } from "lucide-react"

export const USE_CASES = [
  { group: "Build", icon: ShoppingBag, tone: "coral", title: "Online stores", text: "Product pages, cart, checkout, accounts and an admin panel with a real database.", prompt: "Build an online store for my clothing brand with product pages, a cart, checkout, customer accounts and an admin panel to manage products and orders" },
  { group: "Build", icon: MessagesSquare, tone: "", title: "Social apps and messengers", text: "Feeds, profiles, photo posts, an explore page and real time chat between friends.", prompt: "Build a social app with sign up, profiles, photo posts, likes and comments, an explore page ranked by engagement, and real time chat with websockets" },
  { group: "Build", icon: LayoutDashboard, tone: "blue", title: "Dashboards and internal tools", text: "Sign in, tables with filters, charts and exports for your team's data.", prompt: "Build an internal dashboard for our sales data with sign in, a table with filters and search, charts by month and region, and CSV export" },
  { group: "Build", icon: Bot, tone: "mint", title: "Bots and automations", text: "Telegram and Discord bots, scheduled jobs and integrations that run on their own.", prompt: "Build a Telegram bot in Python that answers questions about my products from a FAQ file, with an admin command to update the answers" },
  { group: "Build", icon: Smartphone, tone: "cyan", title: "Mobile apps", text: "Cross platform apps with Expo and React Native, ready for both stores.", prompt: "Build a habit tracker mobile app with Expo: daily habits, streaks, reminders and a simple stats screen, with dark mode" },
  { group: "Build", icon: Globe, tone: "amber", title: "Websites and landing pages", text: "Fast, responsive sites with real copy, images and SEO, ready to publish.", prompt: "Build a fast, responsive website for my dental clinic with services, prices, a team page, reviews from a JSON file and an appointment request form" },
  { group: "Fix", icon: Bug, tone: "coral", title: "Fix bugs in real projects", text: "It reproduces the bug, finds the cause, fixes it and adds a test so it stays fixed.", prompt: "The login page of my app crashes when the password is empty. Find the cause, fix it, add a test and run the whole test suite" },
  { group: "Fix", icon: GitPullRequest, tone: "", title: "Reviews and pull requests", text: "Deep code reviews with real findings, then branches, commits and pull requests on GitHub.", prompt: "Review the last pull request in my repo for bugs, security issues and missing tests, and list the findings by severity with fixes" },
  { group: "Fix", icon: Workflow, tone: "blue", title: "Upgrades and refactors", text: "Big refactors and framework upgrades in small, tested steps.", prompt: "Upgrade my React app to the latest version step by step, fix every breaking change and keep the tests passing" },
  { group: "Research", icon: Search, tone: "cyan", title: "Deep research", text: "Many sources, cross checked numbers and a report with links.", prompt: "Research the market for electric cargo bikes in Europe: main brands, prices, growth, and write a sourced report with a comparison table" },
  { group: "Research", icon: BarChart3, tone: "mint", title: "Data analysis", text: "Clean messy files, find the answers and make clear charts and Excel reports.", prompt: "I will attach a sales spreadsheet. Clean it, find the best and worst products by month, and make charts and an Excel summary" },
  { group: "Research", icon: FileText, tone: "amber", title: "Documents and decks", text: "Word, Excel, PowerPoint and PDF files that look professional.", prompt: "Turn the attached notes into a 10 slide PowerPoint pitch deck with a clean design and speaker notes" },
]

export const HOME_FAQ = [
  ["Do I need to know how to code?", "No. Describe what you want in plain words, in English, Persian or another language. If you do code, every file, diff and terminal is yours to read and change."],
  ["How is this different from a chatbot?", "A chatbot writes code for you to copy. Forkwise has a real computer: it installs packages, runs the project, opens it in a browser, tests it, fixes what breaks and only then tells you it is done."],
  ["Will I get a real project or a demo?", "A real project. Forkwise plans every page, splits the code the way a professional team would, uses a real database and sign in, runs the build and checks its own work before it finishes."],
  ["Which AI models can I use?", "Models from Claude, OpenAI, Gemini, DeepSeek, Qwen, Llama, Mistral, Kimi, GLM and more, grouped by maker in the model picker. Pick per chat."],
  ["Can it work on my own computer?", "Yes. The desktop app lets it work in the folders you open, in your own terminal. Forkwise for Chrome lets it use your browser on the sites you allow."],
  ["Is my code private?", "Every workspace runs in its own isolated computer that cannot see other users or the server. Secrets are encrypted and never shown to the model. Read the Security page for the details."],
]

export const PRICING_FAQ = [
  ["Is there a free plan?", "Yes. The free plan has every feature with a daily usage limit. No card needed."],
  ["What counts as usage?", "The AI model's work: the text it reads and writes. Long builds and big files use more. Your usage is shown live in the app."],
  ["How do I pay?", "Paid plans are paid in cryptocurrency (USDT, Bitcoin, Ethereum and more) through NOWPayments. Choose a plan in the app and you get a payment page. The plan switches on by itself when the payment arrives."],
  ["Can I cancel?", "Yes, at any time. Your plan stays active until the end of the paid period, and your chats and files stay yours."],
  ["Do you offer team plans?", "Yes. Teams get usage for everyone, an admin dashboard with limits, the models you choose and help to get started. Talk to us."],
  ["Does the API cost extra?", "No. API usage counts against the same plan as the app."],
]

export const PLANS = [
  { key: "free", name: "Free", desc: "Try Forkwise on real projects.", monthly: 0, yearly: 0, cta: "Start free", to: "/register", features: ["Every feature, with a daily limit", "A private computer per chat", "Desktop app and Forkwise for Chrome", "24 skills, memory and checkpoints", "API keys for your own code"] },
  { key: "pro", name: "Pro", desc: "For people who build every week.", monthly: 20, yearly: 16, cta: "Get Pro", to: "/register?plan=pro", hot: true, tag: "Most popular", features: ["Everything in Free", "10 times the daily usage", "Enough for daily building", "Email support"] },
  { key: "premium", name: "Premium", desc: "Long builds and heavy research.", monthly: 49, yearly: 39, cta: "Get Premium", to: "/register?plan=premium", features: ["Everything in Pro", "30 times the daily usage", "For long builds and heavy research", "Priority support"] },
  { key: "teams", name: "Teams", desc: "Forkwise for your whole company.", monthly: null, yearly: null, cta: "Talk to us", to: "/contact?topic=Teams", features: ["Usage for the whole team", "Admin dashboard and limits", "Models of your choice", "Onboarding and training"] },
]

export const COMPARE = [
  ["Private computer per chat", true, true, true, true],
  ["Live preview, files, changes and terminals", true, true, true, true],
  ["Desktop app on your folders", true, true, true, true],
  ["Forkwise for Chrome", true, true, true, true],
  ["24 built-in skills", true, true, true, true],
  ["Daily usage", "1x", "10x", "30x", "Pooled"],
  ["API keys", true, true, true, true],
  ["Admin dashboard", false, false, false, true],
  ["Support", "Docs", "Email", "Priority", "Dedicated"],
]

const BASE = "https://api.forkwiseai.com"

export const API_TABS = [
  {
    label: "curl",
    code: `# 1. start a chat
curl ${BASE}/api/chats \\
  -H "Authorization: Bearer $FORKWISE_KEY" \\
  -H "Content-Type: application/json" -d '{}'

# 2. give it a task
curl ${BASE}/api/chats/CHAT_ID/messages \\
  -H "Authorization: Bearer $FORKWISE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Build a REST API for a todo app with tests"}'

# 3. watch it work, live
curl -N ${BASE}/api/runs/RUN_ID/events \\
  -H "Authorization: Bearer $FORKWISE_KEY"`,
  },
  {
    label: "Python",
    code: `import json, os, requests

BASE = "${BASE}"
HEAD = {"Authorization": "Bearer " + os.environ["FORKWISE_KEY"]}

chat = requests.post(BASE + "/api/chats", headers=HEAD, json={}).json()["chat"]
run = requests.post(BASE + "/api/chats/" + chat["id"] + "/messages", headers=HEAD,
                    json={"content": "Find and fix the failing test"}).json()

with requests.get(BASE + "/api/runs/" + run["run_id"] + "/events", headers=HEAD, stream=True) as events:
    for line in events.iter_lines():
        if line.startswith(b"data: "):
            event = json.loads(line[6:])
            if event["type"] == "text":
                print(event["text"], end="", flush=True)`,
  },
  {
    label: "Node.js",
    code: `const BASE = "${BASE}"
const head = { Authorization: "Bearer " + process.env.FORKWISE_KEY, "Content-Type": "application/json" }

const { chat } = await (await fetch(BASE + "/api/chats", { method: "POST", headers: head, body: "{}" })).json()
const run = await (await fetch(BASE + "/api/chats/" + chat.id + "/messages", {
  method: "POST", headers: head, body: JSON.stringify({ content: "Write a weekly sales report as a PDF" }),
})).json()

const events = await fetch(BASE + "/api/runs/" + run.run_id + "/events", { headers: head })
for await (const chunk of events.body) process.stdout.write(chunk)`,
  },
]
