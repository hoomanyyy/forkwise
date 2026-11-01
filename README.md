# Forkwise

```
forkwise/
  backend/                 FastAPI  ->  api.forkwiseai.com
    app/
      main.py              ساخت اپ، CORS، ثبت مسیرها
      config.py            همه‌ی تنظیمات از فایل env
      db.py                SQLite
      mailer.py            ایمیل (بازیابی رمز)
      routes/              auth, chats, files, settings, site, preview, terminal
      agent/               حلقه‌ی ایجنت، ابزارها، سندباکس، حافظه، MCP، چک‌پوینت
    sandbox/               Dockerfile کامپیوترِ هر چت
    deploy/                install.sh, update.sh, firewall.sh, nginx.conf
    requirements.txt
    .env.example
  frontend/                React + Vite  ->  forkwiseai.com
    src/
      pages/site/          صفحات سایت (۲۵ صفحه)
      pages/auth/          ورود، ثبت‌نام، فراموشی و تغییر رمز
      pages/app/           اپلیکیشن: چت، پروژه‌ها، قالب‌ها، تنظیمات، پلن، ادمین
      components/          site / app / ui
      content/             متن داکس، بلاگ، قیمت‌ها، قالب‌ها، FAQ
      styles/              base.css, site.css, app.css
    public/images/         تصاویر محصول
    vercel.json, public/_redirects
  .github/workflows/deploy-backend.yml
```

## صفحات

سایت: Home, Product, The computer, Memory and abilities, Plan and control, Pricing, Use cases, Use case (۴ صفحه), Templates, Teams, Compare, Docs, Doc (۱۱ صفحه), Blog, Blog post (۴ صفحه), Changelog, FAQ, Status (زنده از API), About, Brand, Contact (ذخیره در دیتابیس)، Security, Privacy, Terms, 404.
ورود: Login, Register, Forgot, Reset.
اپ: New chat, Chat, Templates, Projects, Project, Settings (General, Memory, Abilities, Connectors, Usage), Plan and usage, Admin.

## نصب بک‌اند (یک بار)

روی سرور:

```
curl -fsSL https://raw.githubusercontent.com/hoomanyyy/forkwise/main/backend/deploy/install.sh -o install.sh
sudo LLM_API_KEY=sk-or-... LLM_MODELS="model-id=Label" bash install.sh --api-domain api.forkwiseai.com --site https://forkwiseai.com
```

کد در `/opt/forkwise/repo`، تنظیمات در `/opt/forkwise/backend.env`، داده‌ها در `/opt/forkwise/data`، سرویس `forkwise-api` روی پورت 5000.
سرویس‌های قدیمی `forkwise` و `forkwise-agent` خودکار خاموش می‌شوند و کانفیگ قدیمی nginx برای api.forkwiseai.com کنار گذاشته می‌شود.

## آپدیت بک‌اند

```
sudo forkwise-update
```

کد جدید را از GitHub می‌گیرد، فقط اگر `requirements.txt` عوض شده باشد پکیج نصب می‌کند، فقط اگر `sandbox/` عوض شده باشد ایمیج را می‌سازد، سرویس را ری‌استارت می‌کند و سلامت API را چک می‌کند.

آپدیت خودکار با هر push: در GitHub → Settings → Secrets سه مقدار `SERVER_HOST`، `SERVER_USER` و `SERVER_SSH_KEY` را بگذارید. از آن به بعد هر تغییری در `backend/` روی main خودش روی سرور می‌رود.

## فرانت‌اند

Vercel یا Cloudflare Pages:
- Root directory: `frontend`
- Build command: `npm run build`
- Output: `dist`
- `VITE_API_URL=https://api.forkwiseai.com` (در `.env.production` هم هست)

هر push به main سایت را خودکار آپدیت می‌کند.

## اجرای محلی

```
cd backend && cp .env.example .env     SANDBOX=local و DATA_DIR=./data و API_URL=http://localhost:5000
pip install -r requirements.txt && ./run.sh
cd frontend && npm install && npm run dev      http://localhost:5173
```

## پیش‌نمایش سایت‌هایی که ایجنت می‌سازد

در Cloudflare یک رکورد `*` (proxied) به IP سرور بسازید و در `backend.env` بگذارید `PREVIEW_HOST=forkwiseai.com`، سپس `install.sh` را با `--preview-host forkwiseai.com` دوباره اجرا کنید. پیش‌نمایش‌ها روی `p-...forkwiseai.com` باز می‌شوند و از کوکی‌های حساب کاربر جدا هستند.

## Model provider: Cloudflare Workers AI

On the server run:

    sudo bash /opt/forkwise/repo/backend/deploy/workers-ai.sh

It asks for the Cloudflare Account ID and an API token with the Workers AI permission, writes them into `/opt/forkwise/backend.env`, restarts `forkwise-api` and prints the status. The previous env file is saved next to it as a backup.
