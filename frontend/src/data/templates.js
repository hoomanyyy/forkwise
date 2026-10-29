// Question templates. The two with "sample" use files that ship with the site in /public/examples.

const TEMPLATES = [
    {
        id: "study-hours",
        category: "Education",
        title: "Does studying more raise exam scores?",
        text: "400 students with weekly study hours, sleep, attendance and exam scores. Three students wrote impossible study hours on purpose, so watch the outlier choices.",
        q: "Do students who study more get higher exam scores?",
        y: "exam score",
        x: "study hours per week",
        sample: "/examples/study-hours.csv",
        sampleName: "study-hours.csv",
        notes: "One row is one student. Some study hour values are impossible typing mistakes."
    },
    {
        id: "coffee-heart",
        category: "Health",
        title: "Does coffee raise heart risk?",
        text: "500 adults with coffee, smoking, exercise, BMI and a heart risk score. A teaching dataset with a hidden-variable trap: smokers also drink more coffee.",
        q: "Does drinking more coffee increase heart risk?",
        y: "heart risk score",
        x: "coffee cups per day",
        sample: "/examples/coffee-heart.csv",
        sampleName: "coffee-heart.csv",
        notes: "One row is one adult. BMI has some empty cells."
    },
    {
        id: "gdp-life",
        category: "Economics",
        title: "Do people in richer countries live longer?",
        text: "Use a country table with GDP per person and life expectancy, for example from the World Bank. Add health columns as possible controls.",
        q: "Do people in richer countries live longer?",
        y: "life expectancy",
        x: "GDP per person"
    },
    {
        id: "sleep-grades",
        category: "Education",
        title: "Does sleep predict grades?",
        text: "A class or school survey with hours of sleep and grades. Add screen time and travel time as other columns.",
        q: "Do students who sleep more get better grades?",
        y: "average grade",
        x: "hours of sleep"
    },
    {
        id: "screen-reading",
        category: "Education",
        title: "Does screen time lower reading scores?",
        text: "Survey data with daily screen time and a reading test score. Age and family background are common controls.",
        q: "Does more screen time lower reading test scores?",
        y: "reading score",
        x: "daily screen time"
    },
    {
        id: "trees-heat",
        category: "Environment",
        title: "Do greener cities have cooler summers?",
        text: "City table with tree cover and summer temperature. Population density and altitude are useful extra columns.",
        q: "Do cities with more tree cover have cooler summers?",
        y: "average summer temperature",
        x: "tree cover percent"
    },
    {
        id: "delivery-repeat",
        category: "Business",
        title: "Does faster delivery bring repeat orders?",
        text: "Customer or order export with delivery time and the number of later orders.",
        q: "Do customers with faster delivery order again more often?",
        y: "repeat orders",
        x: "delivery time in days"
    },
    {
        id: "ads-signups",
        category: "Business",
        title: "Does more ad spend bring more sign-ups?",
        text: "Weekly marketing table with ad spend and sign-ups. Season and price changes are good controls.",
        q: "Do weeks with more ad spend bring more sign-ups?",
        y: "weekly sign-ups",
        x: "weekly ad spend"
    },
    {
        id: "discount-ltv",
        category: "Business",
        title: "Do discounts raise customer value?",
        text: "Customer table with average discount and lifetime value.",
        q: "Do customers who get bigger discounts have higher lifetime value?",
        y: "customer lifetime value",
        x: "average discount percent"
    },
    {
        id: "police-burglary",
        category: "Society",
        title: "Do more police officers mean fewer burglaries?",
        text: "Area table with officers per 1,000 people and burglaries per 1,000 people. Income and density are common controls.",
        q: "Do areas with more police officers have fewer burglaries?",
        y: "burglaries per 1,000 people",
        x: "officers per 1,000 people"
    },
    {
        id: "class-size",
        category: "Education",
        title: "Is class size linked to test scores?",
        text: "School table with average class size, test scores and funding per student.",
        q: "Do schools with smaller classes have higher test scores?",
        y: "average test score",
        x: "average class size"
    },
    {
        id: "exercise-mood",
        category: "Health",
        title: "Is exercise linked to better mood?",
        text: "Daily diary or survey data with minutes of exercise and a mood score.",
        q: "On days with more exercise, is mood better?",
        y: "mood score",
        x: "minutes of exercise"
    }
]

export default TEMPLATES

export function templateLink(t) {
    let link = "/chat?q=" + encodeURIComponent(t.q) + "&y=" + encodeURIComponent(t.y) + "&x=" + encodeURIComponent(t.x)
    if (t.notes) {
        link = link + "&notes=" + encodeURIComponent(t.notes)
    }
    return link
}
