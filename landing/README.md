# Landing (HAC-7 stub)

Single static German landing page for **Mach das mal** with a waitlist email
capture. Built as a placeholder so we have something to point at while the
real product stack (see HAC-2 proposal) is being approved.

## Files

- `index.html` — `de-DE` page: hero, value prop, feature grid, waitlist form, footer.
- `styles.css` — minimal warm/neutral theme, mobile-friendly, system font stack.
- `waitlist.js` — client-side email validation; persists submissions to
  `localStorage` under `mdm.waitlist.v1` until a real backend exists.

## Run locally

No build step. Open `index.html` directly, or:

```sh
python3 -m http.server 5173 --directory landing
# then visit http://localhost:5173
```

## Handover to CMO

Owned by CTO as a stub. Once a CMO is hired they should take over:

- copy (headline, lede, feature wording, button labels)
- SEO (`<title>`, meta description, OG/Twitter tags, structured data, sitemap)
- legal pages (Impressum, Datenschutz — currently `#` placeholders)
- replace the `localStorage`-only waitlist with a real backend submission
  (e.g. Postmark EU + Postgres once the stack lands)
- analytics (EU-hosted, cookieless preferred)

## Out of scope (intentional)

- No framework, no bundler, no CMS — keep it a single static page.
- No backend submission — stubbed in-browser only.
- No tracking pixels until DPA/consent story is decided.
