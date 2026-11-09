export const PLANS = [
  {
    key: "free",
    name: "Free",
    desc: "Try Forkwise on small questions and projects.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    to: "/register",
    features: ["Chat, web research and memory", "A private computer per chat", "Live preview, files, changes and terminal", "GitHub and Gmail accounts", "Your own computer through the desktop app", "Daily usage limit"],
  },
  {
    key: "pro",
    name: "Pro",
    desc: "For people who build with Forkwise every week.",
    monthly: 20,
    yearly: 16,
    cta: "Get Pro",
    to: "/register?plan=pro",
    featured: true,
    tag: "Most popular",
    features: ["Everything in Free", "10 times the daily usage", "Email support"],
  },
  {
    key: "premium",
    name: "Premium",
    desc: "Long builds, big files and heavy research.",
    monthly: 49,
    yearly: 39,
    cta: "Get Premium",
    to: "/register?plan=premium",
    features: ["Everything in Pro", "30 times the daily usage", "Priority support"],
  },
  {
    key: "teams",
    name: "Teams",
    desc: "Your own Forkwise for your company.",
    monthly: null,
    yearly: null,
    cta: "Talk to us",
    to: "/contact?topic=Teams",
    features: ["Usage for the whole team", "Admin dashboard and limits", "Models of your choice", "Onboarding and training"],
  },
]

export const TEMPLATES = [
  { slug: "landing", category: "Websites", title: "Landing page", text: "A modern one-page site with hero, features, pricing and a contact form.", prompt: "Build a modern landing page for my business with a hero section, features, pricing, testimonials and a working contact form. Ask me for the business name first." },
  { slug: "portfolio", category: "Websites", title: "Portfolio from a CV", text: "Attach your CV and get a personal site with projects and contact links.", prompt: "I will attach my CV. Build a personal portfolio website from it with an about section, projects, skills and contact links. Use a clean dark theme." },
  { slug: "shop", category: "Websites", title: "Small online shop", text: "Product grid, product pages, cart and checkout pages.", prompt: "Build a small online shop with a product grid, product detail pages, a cart that remembers items and a checkout page. Use sample products I can replace." },
  { slug: "booking", category: "Websites", title: "Booking site", text: "Services, prices and a booking form that saves requests.", prompt: "Build a booking website for a barbershop with services and prices, a booking form with date and time, and a simple admin page that lists bookings saved in SQLite." },
  { slug: "dashboard", category: "Data", title: "Sales dashboard", text: "Upload a spreadsheet and get charts with filters.", prompt: "I will attach a sales spreadsheet. Clean it and build an interactive dashboard with totals, trends by month, top products and filters, then show it in the preview." },
  { slug: "report", category: "Data", title: "PDF report", text: "Turn data into a short report with charts as a PDF.", prompt: "Analyse the attached file and write a short report as a PDF with the key findings, three charts and a summary table." },
  { slug: "cleanup", category: "Data", title: "Clean a messy file", text: "Fix columns, remove duplicates and export a clean Excel file.", prompt: "Clean the attached file: fix column names, trim spaces, unify dates and phone numbers, remove duplicates, and give me a clean Excel file plus a list of what you changed." },
  { slug: "price-tool", category: "Automation", title: "Price checker tool", text: "Forkwise makes itself a permanent tool for live prices.", prompt: "Make yourself a permanent tool that returns the live price of gold, the US dollar and bitcoin from free public sources. Test it and show me the result." },
  { slug: "telegram", category: "Automation", title: "Telegram bot", text: "A bot that answers commands, ready to deploy.", prompt: "Write a Telegram bot in Python that answers /start and /price with useful replies. Explain how to get the token and run it, and test the code as far as possible." },
  { slug: "scraper", category: "Automation", title: "Website checker", text: "Check pages for broken links, titles and speed.", prompt: "Check the website I give you: list every page you can reach, broken links, missing titles and descriptions, and slow pages. Save the results as a spreadsheet." },
  { slug: "video", category: "Media", title: "Vertical video", text: "Cut and resize a video for Reels, Shorts or TikTok.", prompt: "I will attach a video. Make a 1080x1920 vertical version, keep the most important part centred, cut it to under 60 seconds and compress it for Instagram." },
  { slug: "images", category: "Media", title: "Batch image resize", text: "Resize and convert many images at once.", prompt: "I will attach images. Resize them to 1600px wide, convert them to WebP with good quality, and give me a zip file." },
]

export const FAQ = [
  {
    group: "The basics",
    items: [
      ["What is Forkwise?", "Forkwise is an AI assistant with its own computer. You chat with it like any assistant, but when a request needs real work, it writes code, runs it, shows you the live result and keeps going until it is done."],
      ["Do I need to know how to code?", "No. You describe what you want in plain words, in English or Persian. If you do code, you can read every file, edit it yourself and use the terminal."],
      ["Which languages can I write in?", "Any language the AI model understands. Forkwise answers in the language you write in, and keeps code and file names in English."],
      ["Which AI models does it use?", "Forkwise works with leading models through an OpenAI-compatible API. You can pick the model per chat from the model menu."],
    ],
  },
  {
    group: "How it works",
    items: [
      ["Why doesn't it open a project when I say hello?", "Forkwise decides what each message needs. Greetings and simple questions get a direct answer. Current facts get a web search with sources. Only real work turns on the computer."],
      ["How does memory work?", "When you ask it to remember something, it saves a short fact to your memory and uses it in every later chat. You can see and delete memories in Settings."],
      ["What are abilities?", "When Forkwise needs something it will use again, it can write itself a tool, test it and keep it. Tools and saved skills appear under Abilities, where you can turn them off."],
      ["Can I stop it or undo what it did?", "Yes. Press stop at any time. Every message is a checkpoint, so you can go back to it and the files return to how they were."],
    ],
  },
  {
    group: "Projects and files",
    items: [
      ["Where are my files?", "Each chat, or each project, has its own folder on Forkwise's computer. Open the Files panel to browse and edit them, or download everything as a zip."],
      ["Can I upload files?", "Yes. Attach documents, spreadsheets, images, audio and video to any message. They are saved in the uploads folder of the project."],
      ["Can I share what it built?", "The live preview has its own link you can open in a new tab. For a permanent site, download the files and host them anywhere."],
    ],
  },
  {
    group: "Security and billing",
    items: [
      ["Is my work private?", "Each workspace runs in its own isolated container that cannot see other users or the server. Read the Security page for details."],
      ["How do I pay?", "Paid plans are paid in cryptocurrency (USDT, Bitcoin, Ethereum and more) through NOWPayments. Open Plan and usage in the app, choose a plan and you get a payment page. The plan switches on by itself when the payment is confirmed."],
    ],
  },
]
