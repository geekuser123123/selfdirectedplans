# Self Directed 401k Dallas — One-Page Website

*More Control. More Possibility.*

A static one-page site for self-directed IRA and 401(k) education, built to deploy on Netlify. It uses no framework and has no build step. A Netlify Function handles the contact form.

## Structure

```
index.html                  One-page site (Home, Services, About, Contact + FAQ etc.)
privacy.html, terms.html    Draft legal documents (served at /privacy and /terms)
404.html
assets/
  css/styles.css            All styles (tokens, components, sections, responsive)
  js/main.js                Nav, scroll reveal, service detail dialogs, form submit
  img/                      Responsive WebP crops + og-image.jpg
  fonts/                    Self-hosted Teko & Poppins (Google Fonts, SIL OFL)
  brand/                    Logo system (see below)
netlify/functions/contact.mjs   Form handler: validation, spam filter, webhook relay
netlify.toml                Publish config, clean URLs, security & cache headers
scripts/                    Asset generators (logo, PNG exports, OG image, crops)
```

## Logo system (`assets/brand/`)

| File | Use |
|---|---|
| `logo-dark-bg.svg` / `.png` | Horizontal logo on dark backgrounds |
| `logo-light-bg.svg` / `.png` | Horizontal logo on light backgrounds |
| `icon.svg`, `icon-512.png` | Icon only (pine + copper) |
| `icon-light.svg`, `icon-light-512.png` | Icon only for dark backgrounds |
| `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png` | Favicons / app icons |

The monogram is an angular S: two bars joined by a copper diagonal "path", with chamfered corners that point forward. The wordmark SELF DIRECTED 401K is set in Teko, and DALLAS is set in Poppins, followed by a fine copper rule. All text is outlined to paths, so the SVGs need no fonts installed. To regenerate:

```bash
pip install fonttools brotli
python3 scripts/build-logo.py
node scripts/render-logo-png.js
```

## Deploy on Netlify

1. In Netlify, choose **Add new site → Import an existing project** and select this repository. `netlify.toml` already sets the publish directory (`.`) and the functions directory, so leave the build command empty.
2. In **Site configuration → Environment variables**, add:
   - `CONTACT_WEBHOOK_URL` (**required**): where inquiries are POSTed, e.g. an n8n Webhook node URL or a CRM endpoint.
   - `CONTACT_WEBHOOK_SECRET` (optional): sent as `X-Webhook-Secret`. The function also signs the body as `X-Webhook-Signature: sha256=<HMAC>`, so the receiver can check that it came from the site.
3. Deploy. The form posts to `/api/contact`.

To test locally with the function, run `npx netlify-cli dev`.

### Contact form

- Validation runs on the client (`main.js`) and again on the server (`contact.mjs`).
- Spam protection uses a hidden honeypot field plus a minimum fill time. Spam gets a fake success response and is never forwarded.
- Messages that look like they contain an SSN are rejected. The form asks people not to send account numbers or documents.
- If `CONTACT_WEBHOOK_URL` is not set, the form shows an "unavailable" error. It never claims success when nothing was delivered.
- The payload sent to the webhook looks like this:

```json
{ "type": "website_inquiry", "source": "selfdirected401kdallas-website", "submitted_at": "…",
  "name": "…", "email": "…", "phone": "…", "interest": "Self-Directed IRA", "message": "…",
  "consent": true, "consent_text": "…", "page": "…", "sms_marketing_consent": false }
```

- Submitting the form never implies SMS consent. Any future SMS program needs its own opt-in.
- Without JavaScript, the form still posts and the server redirects back to an on-page message.

## Before launch: required checklist

These items need verified information I did not have, so they are marked `TODO` in the code:

- [ ] **Domain:** the site is set up for `https://www.selfdirected401kdallas.com/` (canonical, Open Graph, schema, `robots.txt`, `sitemap.xml`). Register that domain and add it in Netlify under **Domain management**. If you use a different domain, search the files for `selfdirected401kdallas.com` and replace it.
- [ ] **Name and trademark:** confirm that "Self Directed 401k Dallas" is available and cleared, and confirm the legal business identity. Descriptive names like this can be hard to protect as trademarks.
- [ ] **Contact details:** add the verified phone, email and address to the footer (`index.html`) and, once verified, to the Organization schema.
- [ ] **Legal documents:** `privacy.html` and `terms.html` are drafts with `[bracketed]` placeholders. Counsel needs to complete them.
- [ ] **Compliance language:** have the footer disclaimer, the FAQ answers and the service detail panels reviewed against the actual scope of the service.
- [ ] **About copy:** it currently describes Self Directed 401k Dallas as a "proposed new identity" for The Roth Academy, as the brief specified. Update it once the rebrand is final.
- [ ] **Photography:** the site currently uses crops of the two photos supplied with the brief, so several sections share one source photo. Replace them with distinct, licensed Unsplash/Pexels images (searches like *mature business professional portrait*, *business consultation in modern office*). Add an approved real team or founder photo to About. Do not present stock subjects as clients or staff. To re-crop a source photo, run `python3 scripts/crop-images.py <office> <consultation>` or drop in new WebP files with the same names and sizes. Then regenerate the share image with `node scripts/render-og-image.js`.
- [ ] Check the licences for every image before deploying.
