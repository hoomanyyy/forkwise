import React from "react"
import { Link } from "react-router-dom"
import { FaCheck } from "react-icons/fa"
import Logo from "../../images/logo.svg"
import "../../styles/marketing.css"

export default function AuthLayout({ title, points, children }) {
    return (
        <div className="au">
            <aside className="au-side">
                <Link to="/" className="fw-logo">
                    <img src={Logo} alt="" width="30" height="30" />
                    <span>Forkwise</span>
                </Link>
                <div className="au-side-body">
                    <h2>{title}</h2>
                    <ul>
                        {points.map((p) => (
                            <li key={p}><FaCheck /> {p}</li>
                        ))}
                    </ul>
                </div>
                <div className="au-quote">
                    <p>In 2018, 29 research teams analyzed the same data. 20 found an effect and 9 did not. Forkwise runs that experiment on your own data.</p>
                    <small>Based on Silberzahn, Uhlmann et al., 2018</small>
                </div>
            </aside>
            <main className="au-main">
                <div className="au-form-wrap" style={{ width: "100%", maxWidth: 400 }}>
                    <Link to="/" className="fw-logo au-mobile-logo">
                        <img src={Logo} alt="" width="30" height="30" />
                        <span>Forkwise</span>
                    </Link>
                    {children}
                </div>
            </main>
        </div>
    )
}
