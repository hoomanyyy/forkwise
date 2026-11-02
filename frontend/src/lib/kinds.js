import { Code2, MessageSquare, Palette, Sparkles } from "lucide-react"

export const SECTIONS = [
  { key: "chat", label: "Chat", icon: MessageSquare, to: "/app", newLabel: "New chat" },
  { key: "code", label: "Code", icon: Code2, to: "/app/code", newLabel: "New code session" },
  { key: "design", label: "Design", icon: Palette, to: "/app/design", newLabel: "New design" },
  { key: "customize", label: "Customize", icon: Sparkles, to: "/app/customize", newLabel: "" },
]

export const KIND_HOME = {
  chat: {
    title: null,
    sub: "Ask a question, or describe something to build. Forkwise has its own computer to do the work.",
    placeholder: "Ask anything, or describe what to build",
  },
  code: {
    title: "What are we building?",
    sub: "Code runs on Forkwise's own computer. You get the files, a terminal, every change and a live preview.",
    placeholder: "Describe the app, script or bug you want handled",
  },
  design: {
    title: "What should we design?",
    sub: "Describe a page or screen. Forkwise builds it, opens it, checks it at phone and desktop size and fixes what looks off.",
    placeholder: "Describe the page, screen or style you want",
  },
}

export const CODE_IDEAS = [
  { title: "Build a REST API", text: "Build a small REST API with FastAPI and SQLite for a todo list with users, run it, test every endpoint and show me the results." },
  { title: "Write a Telegram bot", text: "Write a Telegram bot in Python that answers /start and /price with useful replies. Explain how to get the token and test the code as far as possible." },
  { title: "Fix a bug", text: "I will paste an error message and the code around it. Find the cause, fix it, and run the code to prove it works." },
  { title: "Scrape and chart", text: "Write a script that reads a public web page table, saves it as CSV and draws a chart of the main trend. Run it and show me the chart." },
]

export const DESIGN_IDEAS = [
  { title: "Landing page", text: "Design a modern landing page for a software product with a hero, features, pricing and a contact form. Ask me for the product name first." },
  { title: "Dashboard screen", text: "Design an analytics dashboard screen with a sidebar, summary cards, a line chart and a recent activity table. Use a dark theme." },
  { title: "Pricing page", text: "Design a pricing page with three plans, a monthly and yearly toggle and a feature comparison table." },
  { title: "Personal portfolio", text: "Design a personal portfolio website with an about section, selected projects, skills and a contact section." },
]

export const DESIGN_GALLERY = [
  { slug: "d-landing", title: "SaaS landing page", text: "Hero, logos, features, pricing and a call to action.", prompt: "Design a SaaS landing page with a hero, a row of customer logos, three feature blocks, pricing and a final call to action. Use a clean modern style and make it responsive." },
  { slug: "d-dashboard", title: "Analytics dashboard", text: "Sidebar, KPI cards, charts and a data table.", prompt: "Design an analytics dashboard with a sidebar, KPI cards, a line chart, a bar chart and a recent orders table. Dark theme, compact and professional." },
  { slug: "d-shop", title: "Store front", text: "Product grid, filters and a product detail view.", prompt: "Design an online store front with a product grid, category filters, a product detail section and a cart drawer. Warm, friendly style." },
  { slug: "d-portfolio", title: "Portfolio", text: "About, projects and contact for one person.", prompt: "Design a personal portfolio for a designer with a large intro, a project grid, an about section and a contact form. Minimal and elegant." },
  { slug: "d-blog", title: "Blog and articles", text: "Home, article page and an author card.", prompt: "Design a blog with a home page of article cards, a comfortable article reading page and an author card. Focus on readable typography." },
  { slug: "d-restaurant", title: "Restaurant site", text: "Menu, gallery, opening hours and booking.", prompt: "Design a restaurant website with a menu section, a photo gallery, opening hours and a table booking form. Warm colours." },
  { slug: "d-login", title: "Sign-in screens", text: "Sign in, sign up and password reset.", prompt: "Design a set of sign in, sign up and password reset screens with a calm, trustworthy style, clear errors and a social sign-in button." },
  { slug: "d-docs", title: "Documentation site", text: "Sidebar navigation, search and code blocks.", prompt: "Design a documentation site with a sidebar menu, a search box, a page with headings, code blocks and a table of contents on the right." },
]
