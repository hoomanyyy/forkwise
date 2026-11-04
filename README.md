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
      pages/site/          صفحات سایت (محصول، قیمت، داک، بلاگ، تغییرات، دانلود و ...)
      pages/auth/          ورود، ثبت‌نام، فراموشی و تغییر رمز
      pages/app/           اپلیکیشن: چت، پروژه‌ها، قالب‌ها، تنظیمات، پلن، ادمین
      components/          site / app / ui
      content/             متن داکس، بلاگ، قیمت‌ها، قالب‌ها، FAQ
      styles/              base.css, site.css, app.css
    public/images/         تصاویر محصول
    vercel.json, public/_redirects
  desktop-app/             Electron: اپ دسکتاپ (ویندوز، مک، لینوکس)
    main.js                پنجره‌ی اصلی (فرانت Forkwise)، منو، تری، کلید توقف اضطراری
    src/                   اتصال WebSocket، فایل/glob/grep داخل پوشه، شل و جاب‌ها، مرورگر داخلی، ماوس و کیبورد
    test/                  تست‌های واحد و تست مرورگر
  .github/workflows/deploy-backend.yml
  .github/workflows/desktop-release.yml   ساخت نصب‌کننده‌ها با تگ desktop-v*
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

## Database: MySQL

On the server run `sudo bash /opt/forkwise/repo/backend/deploy/mysql.sh`. It installs MySQL, creates the database and user, writes the `MYSQL_*` lines into `/opt/forkwise/backend.env`, copies the old SQLite data and restarts the API. If `MYSQL_DATABASE` is empty the API uses a local SQLite file instead, which is handy for development.

## Google sign-in

On the server run `sudo bash /opt/forkwise/repo/backend/deploy/google.sh` and paste the client ID and secret from the Google Cloud console. Redirect URI: `https://api.forkwiseai.com/api/auth/google/callback`.

To let people link Gmail and Google services (Settings, Connected accounts), add this second redirect URI to the same Google client: `https://api.forkwiseai.com/api/connections/google/callback`. To link GitHub with a button, create a GitHub OAuth app with the callback `https://api.forkwiseai.com/api/connections/github/callback` and set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the server `.env`. Without them people can still link GitHub with a personal access token. Set `SECRET_KEY` to a long random value so stored tokens and secrets are encrypted with your own key.


## اپ دسکتاپ

اپ Electron همان Forkwise را در پنجره‌ی خودش باز می‌کند و دو کار اضافه دارد: دستگاه را بعد از ورود خودکار به حساب وصل می‌کند و با «Work in a folder» ایجنت روی یک پوشه‌ی واقعی کامپیوتر کار می‌کند (خواندن، جستجو، ویرایش، bash، سرور dev) مثل Claude Code و Cursor.

- چت پوشه‌ای در دیتابیس `local_path` و `local_device` دارد. ابزارهای ایجنت در `backend/app/agent/local.py` به جای سندباکس Docker از طریق WebSocket به همان دستگاه می‌روند. حالت پیش‌فرض این چت‌ها «ask» است.
- اپ فقط برای پوشه‌هایی که کاربر خودش در دیالوگ اپ انتخاب کرده کار می‌کند و بیرون از آن پوشه یا داخل `.git` نمی‌نویسد.
- ساخت محلی: `cd desktop-app && npm install && npm start` (برای آدرس دیگر فرانت: `FORKWISE_WEB=http://localhost:5173`). تست: `npm test`.
- انتشار: تگ `desktop-v3.1.0` را push کنید؛ workflow سه نصب‌کننده را به Release اضافه می‌کند. نصب‌کننده‌ها هنوز امضا نشده‌اند و macOS فقط Apple silicon ساخته می‌شود.
