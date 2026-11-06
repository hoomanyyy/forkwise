---
name: seo-web
title: SEO and web vitals
category: Build
description: Make a site rank and load well: metadata, structure, sitemaps, structured data, Core Web Vitals and analytics. Use for marketing sites, shops and blogs.
---
# SEO and web vitals

## Every page
- A unique title (under 60 characters, the main keyword first) and meta description (around 150 characters, written for people).
- One h1, then a logical h2 and h3 outline. Descriptive link text.
- Canonical URL, Open Graph and Twitter card tags with a 1200x630 image.
- Images with alt text, width and height set, modern formats, lazy loading below the fold.
- lang attribute on html (dir="rtl" for Persian and Arabic) and hreflang links when the site has several languages.

## Site level
- Clean URLs, a sitemap.xml and robots.txt, 301 redirects for moved pages, a helpful 404 page.
- Server rendered or prerendered HTML for content pages so crawlers see the content without running JavaScript.
- Structured data in JSON-LD where it fits: Organization, Product with price and availability, Article, FAQ, BreadcrumbList, LocalBusiness. Validate it.

## Core Web Vitals
- LCP under 2.5s: optimize the hero image (preload it, right size), fast server responses, little render blocking CSS and JavaScript.
- CLS under 0.1: reserve space for images, ads and embeds, load fonts with font-display swap.
- INP under 200ms: break up long JavaScript tasks, defer third party scripts.
- Measure with Lighthouse and report before and after scores.

## Content
Pages answer what people search for, in their words, with clear headings and real detail. Thin duplicate pages hurt more than they help.
