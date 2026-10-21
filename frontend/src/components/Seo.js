import { useEffect } from "react"

export const SITE_URL = "https://forkwiseai.com"
export const SITE_NAME = "Forkwise"

function setMeta(attribute, key, content) {
    let tag = document.head.querySelector("meta[" + attribute + "='" + key + "']")
    if (!tag) {
        tag = document.createElement("meta")
        tag.setAttribute(attribute, key)
        document.head.appendChild(tag)
    }
    tag.setAttribute("content", content)
}

function setCanonical(url) {
    let link = document.head.querySelector("link[rel='canonical']")
    if (!link) {
        link = document.createElement("link")
        link.setAttribute("rel", "canonical")
        document.head.appendChild(link)
    }
    link.setAttribute("href", url)
}

function removeCanonical() {
    const link = document.head.querySelector("link[rel='canonical']")
    if (link) {
        link.remove()
    }
}

function setSchema(schema) {
    let script = document.getElementById("page-schema")
    if (!schema) {
        if (script) {
            script.remove()
        }
        return
    }
    if (!script) {
        script = document.createElement("script")
        script.setAttribute("type", "application/ld+json")
        script.setAttribute("id", "page-schema")
        document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(schema)
}

export default function Seo({ title, description, path, noindex, schema }) {
    useEffect(() => {
        document.title = title
        setMeta("property", "og:title", title)
        setMeta("name", "twitter:title", title)

        if (description) {
            setMeta("name", "description", description)
            setMeta("property", "og:description", description)
            setMeta("name", "twitter:description", description)
        }

        if (path !== undefined) {
            setCanonical(SITE_URL + path)
            setMeta("property", "og:url", SITE_URL + path)
        }

        if (noindex) {
            setMeta("name", "robots", "noindex, nofollow")
            removeCanonical()
        } else {
            setMeta("name", "robots", "index, follow, max-image-preview:large")
        }

        setSchema(schema)
    }, [title, description, path, noindex, schema])

    return null
}