import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Register.css"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaCheck } from "react-icons/fa"
import { Link, useNavigate } from "react-router-dom"
import Logo from "../images/logo.svg"
import { sendLoginRequest } from "../api"
import { sendAuthRequestWithWebsocket } from "../api"

export default function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [sending, setSending] = useState(false)

    useEffect(() => {
        function getMe() {
            sendAuthRequestWithWebsocket(
                { type: "whoami" },
                (data) => {
                    if (data.Message === true) {
                        navigate("/dashboard")
                    }
                }
            );
        }

        getMe();
    }, [navigate]);


    function HandleSubmit(e) {
        e.preventDefault()
        setError("")

        if (username.trim() === "" || password === "") {
            setError("Please write your username and password.")
            return
        }

        const data = {
            username: username.trim(),
            password: password
        }

        setSending(true)
        sendLoginRequest(data, (res) => {
            setSending(false)
            if (res.Message === true) {
                navigate("/dashboard")
            } else {
                setError("Username or password is wrong.")
            }
        })
    }

    return (
        <div className="SignupPage">
            <div className="SignupShell">
                <aside className="SignupSide">
                    <Link to="/" className="SideBrand">
                        <img src={Logo} alt="Logo" className="SideLogo" />
                        <span>Forkwise</span>
                    </Link>
                    <h2 className="SideTitle">Welcome back. Your analysts are ready.</h2>
                    <ul className="SideList">
                        <li><FaCheck /> See all your past runs</li>
                        <li><FaCheck /> Explore your data with charts and formulas</li>
                        <li><FaCheck /> Start a new analysis in a minute</li>
                    </ul>
                    <p className="SideNote">A-ISPC 2026 project</p>
                </aside>

                <form className="SignupCard LoginCard" onSubmit={HandleSubmit} noValidate>
                    <h3 className="SignupTitle">Log in</h3>
                    <p className="SignupSubtitle">Use your email or username.</p>

                    <label className="SignupField">
                        <span>Email or username</span>
                        <div className="IconInput">
                            <FaUser className="FieldIcon" />
                            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="sara_data" autoFocus />
                        </div>
                    </label>

                    <label className="SignupField">
                        <span>Password</span>
                        <div className="IconInput">
                            <FaLock className="FieldIcon" />
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                            <button type="button" className="EyeButton" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </label>

                    {error !== "" && <div className="SignupError">{error}</div>}

                    <button
                        type="submit"
                        className="SignupButton"
                        disabled={sending}
                        onMouseMove={(e) => {
                            const box = e.currentTarget.getBoundingClientRect()
                            e.currentTarget.style.setProperty("--x", e.clientX - box.left + "px")
                            e.currentTarget.style.setProperty("--y", e.clientY - box.top + "px")
                        }}
                    >
                        {sending ? "Logging in..." : "Log in"}
                    </button>

                    <p className="SignupFooter">
                        Don't have an account? <Link to="/register">Create an account</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
