import React, { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"

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
import Download from "./pages/Download"
import Plans from "./pages/Plans"
import PaymentResult from "./pages/PaymentResult"

import Product from "./pages/site/Product"
import ProductAssistant from "./pages/site/ProductAssistant"
import ProductResults from "./pages/site/ProductResults"
import Solution from "./pages/site/Solution"
import UseCases from "./pages/site/UseCases"
import Compare from "./pages/site/Compare"
import Docs from "./pages/site/Docs"
import Changelog from "./pages/site/Changelog"
import Status from "./pages/site/Status"
import Security from "./pages/site/Security"
import Research from "./pages/site/Research"
import Glossary from "./pages/site/Glossary"

import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"

import Dashboard from "./pages/Dashboard"
import Chat from "./pages/Chat"
import PredictResult from "./pages/PredictResult"
import Invoices from "./pages/Invoices"
import AdminDashboard from "./pages/AdminDashboard"
import Runs from "./pages/app/Runs"
import Assistant from "./pages/app/Assistant"
import Datasets from "./pages/app/Datasets"
import Templates from "./pages/app/Templates"
import Usage from "./pages/app/Usage"
import Settings from "./pages/app/Settings"
import Help from "./pages/app/Help"
import Agent from "./pages/app/Agent"
import AgentTask from "./pages/app/AgentTask"

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                {/* website */}
                <Route path="/" element={<Landing />} />
                <Route path="/product" element={<Product />} />
                <Route path="/product/assistant" element={<ProductAssistant />} />
                <Route path="/product/results" element={<ProductResults />} />
                <Route path="/solutions/:slug" element={<Solution />} />
                <Route path="/use-cases" element={<UseCases />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/pricing" element={<Plans />} />
                <Route path="/plans" element={<Navigate to="/pricing" replace />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/docs/:slug" element={<Docs />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/status" element={<Status />} />
                <Route path="/security" element={<Security />} />
                <Route path="/research" element={<Research />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/learn/multiverse-analysis" element={<LearnMultiverse />} />
                <Route path="/learn/specification-curve" element={<LearnSpecCurve />} />
                <Route path="/examples/coffee-and-heart-risk" element={<ExampleCoffee />} />
                <Route path="/download" element={<Download />} />
                <Route path="/payment/success" element={<PaymentResult />} />
                <Route path="/payment/partial" element={<PaymentResult partial />} />

                {/* sign in */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* app */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/runs" element={<Runs />} />
                <Route path="/runs/:id" element={<PredictResult />} />
                <Route path="/agent" element={<Agent />} />
                <Route path="/agent/:id" element={<AgentTask />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/assistant/:id" element={<Assistant />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/billing" element={<Navigate to="/invoices" replace />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
                <Route path="/admin" element={<AdminDashboard />} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    )
}
