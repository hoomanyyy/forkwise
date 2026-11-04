import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, Minus } from "lucide-react"
import { CtaBand, PageHero, Section, usePageTitle } from "../../components/site/parts"
import { useStore } from "../../lib/store"
import { PLANS, FAQ } from "../../content/catalog"

export function Pricing() {
  usePageTitle("Pricing", "Start free. Upgrade when Forkwise becomes part of your work.")
  const [yearly, setYearly] = useState(false)
  const { user } = useStore()
  return (
    <>
      <PageHero
        align="center"
        kicker="Pricing"
        title="Start free. Pay when it pays off."
        lead="Every plan includes the full product: chat, web research, memory, the computer and live preview. Paid plans give you more room to build."
        actions={
          <div className="price-toggle" role="group" aria-label="Billing period">
            <button type="button" className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Monthly</button>
            <button type="button" className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Yearly<small>save 20%</small></button>
          </div>
        }
      />
      <section className="section tight">
        <div className="section-inner">
          <div className="plans">
            {PLANS.map((plan) => {
              const price = yearly ? plan.yearly : plan.monthly
              return (
                <div key={plan.key} className={"plan" + (plan.featured ? " featured" : "")}>
                  {plan.tag && <span className="plan-tag">{plan.tag}</span>}
                  <h3>{plan.name}</h3>
                  <p className="plan-desc">{plan.desc}</p>
                  <div className="plan-price">
                    {price === null ? <b style={{ fontSize: 30 }}>Custom</b> : <><b>${price}</b><span>per month{yearly && price > 0 ? ", billed yearly" : ""}</span></>}
                  </div>
                  <Link to={user && (plan.key === "pro" || plan.key === "premium") ? "/app/billing" : plan.to} className={"btn " + (plan.featured ? "btn-primary" : "btn-ghost")}>{plan.cta}</Link>
                  <ul>
                    {plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="faint small center-text" style={{ marginTop: 26 }}>Prices in US dollars, paid in cryptocurrency (USDT, Bitcoin, Ethereum and more) through NOWPayments. Free accounts work today.</p>
        </div>
      </section>
      <Section title="Compare plans">
        <div className="table-scroll">
          <table className="compare-table">
            <thead><tr><th>Feature</th><th>Free</th><th className="ours">Pro</th><th>Premium</th><th>Teams</th></tr></thead>
            <tbody>
              {[
                ["Chat, research and memory", 1, 1, 1, 1],
                ["Private computer, preview and terminal", 1, 1, 1, 1],
                ["Projects, abilities and connectors", 1, 1, 1, 1],
                ["GitHub, Gmail and secrets", 1, 1, 1, 1],
                ["Your own computer (desktop app)", 1, 1, 1, 1],
                ["Daily usage", "1x", "10x", "30x", "Your limits"],
                ["Self-hosting", 0, 0, 0, 1],
                ["Admin dashboard", 0, 0, 0, 1],
              ].map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  {row.slice(1).map((value, index) => (
                    <td key={index} className={(index === 1 ? "ours " : "") + (value ? "yes" : "no")}>{typeof value === "string" ? value : value ? <Check size={16} /> : <Minus size={16} />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section className="paper" title="Questions">
        <div className="faq-list">
          {FAQ[0].items.slice(0, 2).concat(FAQ[3].items).concat([["What happens when I reach the limit?", "Forkwise pauses until the next day, or until you upgrade. Your chats and files stay."], ["Can I cancel any time?", "Yes. Your plan stays active until the end of the period you paid for."]]).map((item) => (
            <details key={item[0]} className="faq-item"><summary>{item[0]}</summary><p>{item[1]}</p></details>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  )
}
