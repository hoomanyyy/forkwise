import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"
import About from "./pages/About"
import HowItWorks from "./pages/HowItWorks"
import Faq from "./pages/Faq"
import Contact from "./pages/Contact"
import Privacy from "./pages/Privacy"
import Learn from "./pages/Learn"
import LearnMultiverse from "./pages/LearnMultiverse"
import LearnSpecCurve from "./pages/LearnSpecCurve"
import ExampleCoffee from "./pages/ExampleCoffee"
import NotFound from "./pages/NotFound"
import Dashboard from "./pages/Dashboard"
import Chat from "./pages/Chat"
import Login from "./pages/Login"
import Register from "./pages/Register"
import PredictResult from "./pages/PredictResult"
import AdminDashboard from "./pages/AdminDashboard"

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/learn/multiverse-analysis" element={<LearnMultiverse />} />
                <Route path="/learn/specification-curve" element={<LearnSpecCurve />} />
                <Route path="/examples/coffee-and-heart-risk" element={<ExampleCoffee />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/runs/:id" element={<PredictResult />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    )
}