import { Link } from "react-router-dom"

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">Page not found</h1>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Go home</Link>
    </section>
  )
}
