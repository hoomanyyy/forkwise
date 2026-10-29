import { FaGraduationCap, FaFlask, FaNewspaper, FaBriefcase } from "react-icons/fa"

const SOLUTIONS = [
    {
        slug: "students",
        name: "Students",
        icon: FaGraduationCap,
        title: "Data projects that hold up when a judge pushes back",
        short: "For science fairs, school research, theses and class projects.",
        lead: "You found a pattern in your data. Your teacher, examiner or competition judge will ask the hard question: would you get the same answer with a different method? Forkwise lets you answer that before they ask.",
        points: [
            "Test your hypothesis with 10 to 100 different analyses in minutes, without writing code",
            "Show a specification curve in your report, the same chart researchers use in published papers",
            "Read every analyst's choices and reasons, so you learn what controls and outliers really do",
            "Free plan for everyday projects, with clear limits shown in your dashboard"
        ],
        examples: [
            { q: "Do students who sleep more get higher exam scores?", y: "exam score", x: "hours of sleep" },
            { q: "Does screen time lower reading test results?", y: "reading score", x: "daily screen time" },
            { q: "Do greener cities have cooler summers?", y: "average summer temperature", x: "tree cover percent" }
        ],
        steps: [
            { title: "Bring your table", text: "A CSV or Excel file from a survey, a public dataset or your own experiment. One row can be a student, a city or a day." },
            { title: "Write your question", text: "In your own words. Forkwise matches your words to the right columns and shows you which ones it picked." },
            { title: "Put the verdict in your report", text: "Download the charts as PNG and explain in one sentence whether your finding is robust, fragile or depends on choices." }
        ]
    },
    {
        slug: "researchers",
        name: "Researchers",
        icon: FaFlask,
        title: "A robustness check before reviewer two runs one for you",
        short: "For academics, PhD students and research teams.",
        lead: "Many-analysts studies showed that teams working on the same data can reach opposite conclusions. Forkwise runs that experiment on your dataset in minutes, so you see how much your result depends on your own analytic choices.",
        points: [
            "Independent AI analysts from three open models and five analyst styles choose controls, outlier rules and missing-value rules",
            "Every estimate is computed in Python with pandas and statsmodels, never by the language model",
            "A specification curve, the full table of choices and an exportable CSV of every analyst",
            "Transparent verdict rules you can cite and check on the documentation pages"
        ],
        examples: [
            { q: "Is higher income linked to longer life expectancy across countries?", y: "life expectancy", x: "GDP per person" },
            { q: "Does class size predict test scores once school funding is held constant?", y: "test score", x: "class size" },
            { q: "Does drinking more coffee increase heart risk?", y: "heart risk score", x: "coffee cups per day" }
        ],
        steps: [
            { title: "Upload one or several files", text: "Join files on a common column such as country and year, or stack files that share the same columns." },
            { title: "Pre-register your expectation", text: "Pick the direction you expect before you see results. Forkwise stores it with the run." },
            { title: "Report the distribution", text: "Export every analyst's estimate, p value and rows used, and report the spread rather than one number." }
        ]
    },
    {
        slug: "journalists",
        name: "Journalists",
        icon: FaNewspaper,
        title: "Check a data claim before it becomes your headline",
        short: "For data reporters, fact-checkers and newsrooms.",
        lead: "A press release says X causes Y. A single analysis seems to agree. Forkwise shows whether the link survives many reasonable ways of looking at the same numbers, and tells you in plain words when it does not.",
        points: [
            "Upload the dataset behind a claim and test it in minutes",
            "A plain-language verdict you can explain to an editor in one sentence",
            "See the choices that change the answer, such as one control variable",
            "Forkwise Assistant explains any run in simple words when you need a quick summary"
        ],
        examples: [
            { q: "Do cities with more police officers have fewer burglaries?", y: "burglaries per 1,000 people", x: "officers per 1,000 people" },
            { q: "Are richer regions healthier?", y: "life expectancy", x: "median income" },
            { q: "Did the new policy lower unemployment?", y: "unemployment rate", x: "policy in force" }
        ],
        steps: [
            { title: "Get the source data", text: "Most official statistics come as CSV or Excel. Upload the file as it is." },
            { title: "Ask the claim as a question", text: "Write the claim as Y and X. Add notes such as the time period the claim covers." },
            { title: "Report with care", text: "Robust is not proof of cause. Use the verdict to decide how strongly to word the story." }
        ]
    },
    {
        slug: "business",
        name: "Business analysts",
        icon: FaBriefcase,
        title: "Know if a KPI driver is real before you put budget behind it",
        short: "For analysts, marketers and product teams.",
        lead: "Dashboards show correlations every day. Before you move budget, find out whether the driver you found survives different controls, outlier handling and missing-data rules, or whether it only appears with one setup.",
        points: [
            "Test drivers of revenue, churn or conversion on your own exports",
            "See if the effect keeps its direction across analysts, and how big it really is",
            "Share a clear verdict and charts with people who will never read a regression table",
            "Pro and Premium plans add more analysts per run, more daily runs and CSV export"
        ],
        examples: [
            { q: "Does faster delivery increase repeat orders?", y: "repeat orders", x: "delivery time in days" },
            { q: "Do discounts raise customer lifetime value?", y: "lifetime value", x: "discount percent" },
            { q: "Does more ad spend bring more sign-ups?", y: "weekly sign-ups", x: "weekly ad spend" }
        ],
        steps: [
            { title: "Export from your tools", text: "A CSV from your CRM, shop or analytics tool. One row can be a customer, an order or a week." },
            { title: "Ask about one driver", text: "One outcome and one main variable per run. Add the other columns you care about as notes." },
            { title: "Decide with the spread", text: "If the verdict is choice dependent, test more before you act on it." }
        ]
    }
]

export default SOLUTIONS

export function verdictLabel(verdict) {
    if (!verdict) {
        return "-"
    }
    return verdict.replaceAll("_", " ")
}
