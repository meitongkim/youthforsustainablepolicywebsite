# YSP Global Chapters Portal — setup

The Global Chapters portal (`/chapter-portal`) is locked behind an access code. YSP Learns stays public.
The lock runs on Vercel's servers (`middleware.js` + `api/portal-login.js`), so it only works on the deployed site.

## One-time setup in Vercel
Project → Settings → Environment Variables → add (Production and Preview), then redeploy:

| Name | Value |
|---|---|
| `PORTAL_SECRET` | a long random string, **at least 32 characters**. Never share it. |
| `CHAPTERS_PORTAL_CODE` | the access code: **8–64 characters, letters, numbers and hyphens only** (e.g. `YSP-Chapters-7Q4k-2027`). |

If either is missing or invalid, the portal stays locked for everyone.

## What the sign-in accepts
Only a POST from this website's own sign-in page, with a single `code` field that is 8–64 letters, numbers or hyphens.
Anything else (other characters, extra fields, oversized or non-form requests, requests from other websites) is rejected.
Wrong codes are slowed down, and 5 failed attempts from one address lock it out for 15 minutes.

## Sessions
A correct code gives a signed, HttpOnly cookie valid for 14 days.
Changing `CHAPTERS_PORTAL_CODE` (or `PORTAL_SECRET`) signs everyone out immediately.

## Recommended extra protection
In Vercel → Firewall, add a rate-limit rule for the path `/api/portal-login` (for example 10 requests per minute per IP).
The built-in attempt limit is per server instance, so the firewall rule makes it airtight.
