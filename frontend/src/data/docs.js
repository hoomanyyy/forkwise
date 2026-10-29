// Documentation pages. Each page is a list of simple blocks so the page component can draw it.
// Block types: h2, p, list, steps, callout, table, code

const DOCS = [
    {
        slug: "quickstart",
        group: "Getting started",
        title: "Quickstart: your first analysis",
        summary: "From sign-up to your first verdict in about five minutes.",
        blocks: [
            { type: "p", text: "This guide takes you through one full run. You need a free account and one data file. If you do not have a file yet, download a sample from the Templates page in the app." },
            { type: "h2", text: "1. Create an account" },
            { type: "p", text: "Go to the sign-up page, write your name, email, username and password, and ask for a verification code. We send an 8 digit code to your email. Write it in the form and create the account." },
            { type: "h2", text: "2. Start a new analysis" },
            { type: "p", text: "In the app, click New analysis. Drag your CSV, Excel or JSON file into the upload box. For every file, write what one row means (for example one student) and a short description." },
            { type: "h2", text: "3. Ask one question" },
            { type: "p", text: "Write your question, the outcome (Y) and the main variable (X) in your own words. Then choose what you expect before you see the results." },
            { type: "code", text: "Question  Do students who study more get higher exam scores?\nY         exam score\nX         study hours per week\nExpect    It increases the outcome" },
            { type: "h2", text: "4. Choose the number of analysts and start" },
            { type: "p", text: "10 analysts is a quick test and takes about a minute. 25 or more gives a more reliable verdict. Your plan sets the maximum. Keep the page open while the analysts work." },
            { type: "h2", text: "5. Read the result" },
            { type: "p", text: "The result page shows the verdict, the share of analysts that agree on the direction, the share that found a real effect, a specification curve, your data with fitted formulas and the full table of analyst choices." },
            { type: "callout", text: "Check the Y and X column names on the result page first. If the AI matched your words to the wrong column, run the analysis again with the exact column names." }
        ]
    },
    {
        slug: "preparing-data",
        group: "Getting started",
        title: "Prepare your data",
        summary: "File types, missing values and how several files are combined.",
        blocks: [
            { type: "h2", text: "File types" },
            { type: "list", items: ["CSV (.csv)", "Excel (.xlsx or .xls)", "JSON (.json). Nested JSON is flattened into columns."] },
            { type: "h2", text: "One table, one meaning per row" },
            { type: "p", text: "Each row should be one thing: one student, one country in one year, one order. Write this in the field What does one row mean. It helps the analysts choose sensible controls." },
            { type: "h2", text: "Number columns" },
            { type: "p", text: "The outcome, the main variable and the controls must be number columns. Text columns are described to the analysts but cannot be used as controls." },
            { type: "h2", text: "Missing values" },
            { type: "p", text: "Tell Forkwise how empty values are written in your file: an empty cell, NA, 0, -1 or -999. Values that use a number marker are turned into missing values before any analysis." },
            { type: "h2", text: "Several files" },
            { type: "table", head: ["Choice", "Use it when", "Example"], rows: [
                ["Same columns, more rows", "Every file has the same columns", "One file per year"],
                ["Connected by a common column", "Files have different columns about the same things", "GDP file and health file, both with country and year"],
                ["Separate files", "Extra files only give context", "A file that explains codes"]
            ] },
            { type: "p", text: "For a join, write the common column. It must exist in every file. For two columns, write them with a comma, for example country, year." },
            { type: "callout", text: "Please do not upload personal data such as names, addresses or health records of real people. Public datasets work best." }
        ]
    },
    {
        slug: "writing-questions",
        group: "Getting started",
        title: "Write a good question",
        summary: "One outcome, one main variable, and an expectation set in advance.",
        blocks: [
            { type: "p", text: "Forkwise tests one relationship per run: how the outcome Y changes when the main variable X changes, while each analyst chooses what else to hold constant." },
            { type: "h2", text: "Good questions" },
            { type: "list", items: [
                "Do students who sleep more get higher exam scores?",
                "Do countries with higher income per person have longer life expectancy?",
                "Do weeks with more ad spend bring more sign-ups?"
            ] },
            { type: "h2", text: "Questions to split up" },
            { type: "list", items: [
                "Which of ten factors matters most? Ask about one factor per run.",
                "Does X cause Y? Forkwise tests whether a relationship survives many choices. It cannot prove cause and effect.",
                "Questions about one single row, like what will this customer do next."
            ] },
            { type: "h2", text: "Your own words are fine" },
            { type: "p", text: "You do not need exact column names. The AI matches your words to the number columns in the file and the result page shows which columns it picked." },
            { type: "h2", text: "Choose your expectation first" },
            { type: "p", text: "Before the run, pick whether you expect X to increase Y, decrease it, have no effect, or you do not know. Choosing before you see results keeps you honest when you read them." },
            { type: "h2", text: "Notes" },
            { type: "p", text: "Use the notes field for anything an analyst should know: a change in how data was collected, a known error in some rows, or the time period your question is about." }
        ]
    },
    {
        slug: "verdicts",
        group: "Results",
        title: "Verdicts and their rules",
        summary: "Robust, fragile, choice dependent and no effect, and exactly how each is decided.",
        blocks: [
            { type: "p", text: "The judge looks at every valid analyst together. It counts two things: how many analysts found the same direction of effect, and how many found a real effect, meaning a p value below 0.05. The rules are checked in this order." },
            { type: "table", head: ["Verdict", "Rule", "What it means"], rows: [
                ["No effect", "20% or fewer analysts find p below 0.05", "The data does not support the link with these choices"],
                ["Robust", "At least 90% agree on the direction and at least 80% find p below 0.05", "The finding survives the analysis choices"],
                ["Fragile", "At least 85% agree on the direction and at least 30% find p below 0.05", "Same direction, but often not clear enough to call it real"],
                ["Choice dependent", "Anything else", "The answer changes with the choices, sometimes even the direction"]
            ] },
            { type: "h2", text: "When there is no verdict" },
            { type: "p", text: "Analyses with fewer than 30 usable rows are ignored. If too few analysts are valid, the run has no verdict. Upload more data or check your missing-value setting." },
            { type: "callout", text: "Robust does not mean X causes Y. A hidden variable that is not in your file can still explain the relationship. See the coffee example in Learn." }
        ]
    },
    {
        slug: "reading-results",
        group: "Results",
        title: "Read the result page",
        summary: "What every number and chart on a result page tells you.",
        blocks: [
            { type: "h2", text: "Summary numbers" },
            { type: "table", head: ["Number", "Meaning"], rows: [
                ["Analysts", "How many AI analysts produced a valid result"],
                ["Same direction", "Share of analysts whose effect has the most common sign"],
                ["Significant", "Share of analysts with p below 0.05"],
                ["Middle effect", "The median effect of all analysts"],
                ["Effect range", "Smallest and largest effect found"],
                ["Largest ÷ smallest", "How many times bigger the largest effect is than the smallest, when all are positive"]
            ] },
            { type: "h2", text: "Specification curve" },
            { type: "p", text: "One dot per analyst, sorted from the smallest to the largest effect. Filled dots are significant. Below the dots, a grid shows which controls, outlier rule and missing-value rule each analyst used, so you can see which choice moves the result." },
            { type: "h2", text: "Correlations with Y" },
            { type: "p", text: "How strongly each number column moves together with the outcome. Correlation is not cause. It helps you see which controls may matter." },
            { type: "h2", text: "Data explorer" },
            { type: "p", text: "Your real data as a scatter or line chart, with six fitted formulas: linear, quadratic, cubic, logarithmic, power and exponential, ranked by adjusted R². You can switch axes, use a log scale, draw on the chart and download it." },
            { type: "h2", text: "Analyst table" },
            { type: "p", text: "Every analyst's controls, outlier rule, missing-value rule, effect, p value, reason and the number of rows used." }
        ]
    },
    {
        slug: "analysts",
        group: "Results",
        title: "How the AI analysts work",
        summary: "Three models, five styles, and Python checks on every answer.",
        blocks: [
            { type: "h2", text: "Models and styles" },
            { type: "p", text: "Forkwise uses three open models on Cloudflare Workers AI: Llama 3.3 70B, Llama 3.1 8B and Mistral Small 3.1. Each analyst also gets one of five styles, for example one that prefers simple analyses and one that prefers many controls. This makes the analysts really differ, like human research teams do." },
            { type: "h2", text: "What an analyst decides" },
            { type: "list", items: [
                "Controls: which other columns to hold constant",
                "Outliers: keep them, or remove values more than 3 standard deviations away",
                "Missing values: remove those rows, or fill them with the median"
            ] },
            { type: "p", text: "Each analyst returns its plan as JSON with a short reason. The AI never calculates any number." },
            { type: "h2", text: "What an analyst sees" },
            { type: "p", text: "Only a summary: column names, smallest, average and largest values, the share of empty cells, and up to three example values from text columns, plus your question, notes and file descriptions. Analysts never see your full rows." },
            { type: "h2", text: "Checks before any calculation" },
            { type: "list", items: [
                "Columns that do not exist are removed",
                "Columns that are not numbers are removed",
                "The outcome or main variable inside the controls is removed",
                "Controls whose name contains the outcome name are removed, because they often leak the outcome"
            ] }
        ]
    },
    {
        slug: "statistics",
        group: "Results",
        title: "The statistics behind each run",
        summary: "OLS regression with statsmodels, standardized effects and p values.",
        blocks: [
            { type: "p", text: "For each analyst, Python cleans the data with that analyst's choices and runs an ordinary least squares regression with statsmodels." },
            { type: "code", text: "Y = a + b · X + c1 · control1 + c2 · control2 + ..." },
            { type: "list", items: [
                "Predictors are standardized, so the effect b is the change in Y when X goes up by one standard deviation",
                "The p value tells how likely an effect this large would be by chance",
                "Each analyst records the effect of X, its p value and the number of rows used",
                "Analyses with fewer than 30 rows are ignored"
            ] },
            { type: "h2", text: "Fitted formulas in the data explorer" },
            { type: "p", text: "The data explorer fits six simple formulas to the outcome and the main variable and ranks them by adjusted R². This describes the shape of the relationship in your data. It is separate from the verdict." },
            { type: "h2", text: "Current limits" },
            { type: "p", text: "Every analysis uses linear regression today. Outcomes that are only 0 or 1, or are counts, would need other models. Keep this in mind when you read the result." }
        ]
    },
    {
        slug: "assistant",
        group: "Platform",
        title: "Forkwise Assistant",
        summary: "Ask follow-up questions about any finished run.",
        blocks: [
            { type: "p", text: "The Assistant is a chat about one finished run. It reads the run's results and the earlier messages in the same chat, and answers in plain words." },
            { type: "h2", text: "Where to find it" },
            { type: "list", items: [
                "Assistant in the app menu: pick any finished run from the list",
                "Open in Assistant on a result page",
                "The Ask AI button at the bottom of a result page"
            ] },
            { type: "h2", text: "Good things to ask" },
            { type: "list", items: [
                "Explain this result in simple words",
                "Why do the analysts disagree?",
                "Which choice changed the result the most?",
                "Draw a chart of the effect of each analyst"
            ] },
            { type: "callout", text: "The Assistant explains. It does not change the numbers. Every number on the result page comes from the Python analysis. Daily message limits depend on your plan." }
        ]
    },
    {
        slug: "export",
        group: "Platform",
        title: "Export charts and data",
        summary: "PNG charts for everyone, CSV of every analyst on paid plans.",
        blocks: [
            { type: "list", items: [
                "Download PNG: every chart on the result page has a download button",
                "Export CSV: one row per analyst with controls, rules, effect, p value and rows used. Included in plans with export",
                "Data explorer CSV: the sample of your data shown in the chart, available on every result page"
            ] },
            { type: "p", text: "When your plan does not include export, the button shows a lock and takes you to the plans page." }
        ]
    },
    {
        slug: "plans-limits",
        group: "Platform",
        title: "Plans and limits",
        summary: "What daily limits mean and what changes when you upgrade.",
        blocks: [
            { type: "p", text: "Every plan uses the same method. Plans differ in four things:" },
            { type: "list", items: ["Analyses per day", "Maximum analysts per run", "Assistant messages per day", "CSV export"] },
            { type: "p", text: "Daily limits reset every day. You can see what you used today in the app under Usage, and in the plan box at the bottom of the menu." },
            { type: "h2", text: "Paying" },
            { type: "p", text: "Paid plans last 30 days. Payments are made in cryptocurrency through NOWPayments. The plan becomes active a few minutes after the payment is confirmed. Your invoices are under Billing." },
            { type: "p", text: "If a payment is only partly received, contact us with the invoice number and we will fix it." }
        ]
    },
    {
        slug: "account",
        group: "Platform",
        title: "Account and security",
        summary: "Verification codes, passwords and your data.",
        blocks: [
            { type: "list", items: [
                "Sign-up uses an 8 digit code sent to your email",
                "Passwords are stored only as a bcrypt hash, never as text",
                "A session cookie keeps you logged in",
                "Forgot your password? Ask for a reset code on the log in page"
            ] },
            { type: "h2", text: "Your files" },
            { type: "p", text: "Uploaded files are read by Python on our server and deleted right after. For each run we keep your question, the file names, the results of every analyst and a random sample of up to 1000 rows for the charts." },
            { type: "h2", text: "Deleting your data" },
            { type: "p", text: "Send us a message from your account email and we will delete your account or your analyses." }
        ]
    },
    {
        slug: "android",
        group: "Platform",
        title: "Android app",
        summary: "Install the app and use the same account.",
        blocks: [
            { type: "p", text: "The Android app works with the same account as the website. Download it from the download page, allow the install from your browser when Android asks, and log in." },
            { type: "p", text: "Forkwise is not on Google Play yet, so Android shows a warning before installing. Only download the app from the Forkwise website. There is no iPhone app yet, but the website works in Safari and you can add it to your home screen." }
        ]
    },
    {
        slug: "limitations",
        group: "Platform",
        title: "What Forkwise cannot do",
        summary: "Honest limits you should know before you trust a verdict.",
        blocks: [
            { type: "list", items: [
                "It finds relationships, not causes. A robust result is still not proof that X causes Y.",
                "The leakage check only looks at column names. A column like total greenhouse gas contains CO2 but does not have co2 in its name.",
                "Every analysis uses linear regression today. Outcomes that are only 0 or 1, or are counts, would need other models.",
                "If no column matches your words, the AI may pick the closest one. Always check the Y and X names on the result page.",
                "A hidden variable that is not in your file can fool every analyst at the same time."
            ] }
        ]
    }
]

export default DOCS
