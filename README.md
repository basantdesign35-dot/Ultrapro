# ULTRAPRO — Paper Bag Design Requests

Next.js 14 (App Router, TypeScript) + Tailwind + Firebase Auth/Realtime Database + Formspree.
Clients submit a 5-step design request. Approved designers work on requests in a private dashboard.

## What is fully working vs. what needs something else

| Feature | Status |
|---|---|
| 5-step client form, validation (React Hook Form + Zod), draft autosave (text only) | Implemented |
| Panel logic (custom / repeat / designer's choice / blank / same content-different layout), loop prevention | Implemented, unit-tested |
| Bag size "I don't know" → "Pending confirmation"; separate number to print on bag | Implemented |
| Written instructions (Hindi/English/Hinglish) | Implemented |
| Audio recording (record, pause/resume, play, delete, re-record, duration, permission-denied and unsupported fallbacks) | Implemented |
| Formspree submission (text only, JSON) | Implemented. Needs `NEXT_PUBLIC_FORMSPREE_ENDPOINT` |
| Server-side save to Firebase (Admin SDK, server ID + timestamps, idempotent, rate-limited, honeypot) | Implemented. **Needs Firebase Admin credentials** |
| Partial-failure handling (saved but Formspree failed → retry without duplicates) | Implemented |
| Designer login (email/password), logout, password reset, multiple accounts, no public sign-up | Implemented. **Needs Firebase Auth enabled** |
| Dashboard: search, status filter, assigned-to-me, Call / WhatsApp (sanitized numbers) | Implemented |
| Request detail (sections A–E), status, assignment, internal notes (author/admin edit) | Implemented |
| Design brief PDF (jsPDF) + browser Print / Save as PDF | Implemented. PDF cannot draw Hindi, see below |
| Database rules (`firebase-database.rules.json`) | Written. **Not run against the emulator here**, see TESTING.md |
| **Client files and voice notes reaching the designer automatically** | **NOT possible on your current setup.** See below |
| **Persistent private design-file uploads by designers** | **NOT possible on your current setup.** See below |

## Honest limits (please read)

1. **Formspree Free does not accept file uploads.** Third-party comparison pages checked in Sept 2026 list Formspree Free as 50 submissions/month with no file uploads or webhooks. Formspree's own docs confirm a 25 MB per-file cap and plan-based upload storage, but I could not load Formspree's pricing page directly, so **confirm on https://formspree.io/plans before relying on this**. The app therefore sends **text only** and never claims files or audio were uploaded.
2. **Client files and recordings stay on the client's device.** After submit, the success page offers a downloadable ZIP package (summary + files + recordings) to send to the designer on WhatsApp. They are held in browser memory only, so a page reload loses them.
3. **No persistent designer file storage.** You did not authorize Firebase Storage and Formspree is not a private repository. Designers can preview files locally, export a design package ZIP, and *log a version note* (panel, version, file name, "where it is saved"). Logged notes are labelled "file not stored".
   To get real automatic storage you would need one of: Firebase Storage (Blaze plan billing account required for new buckets), a private S3/R2 bucket with signed URLs, or Google Drive via a service account. Any of these needs your approval first.
4. **Free Formspree allows ~50 submissions per month.** Every request is also saved in Firebase, so nothing is lost when Formspree's quota runs out. The designer card shows "email copy not delivered" in that case.
5. **PDF and Hindi.** jsPDF's built-in fonts only draw Latin characters. If a request contains Devanagari, the PDF replaces those characters with "?" and the app warns you. Use **Print / Save as PDF** (browser rendering) for full Hindi text. Embedding a Devanagari TTF font into jsPDF is the upgrade path.
6. **Rate limiting is in-memory** (per server instance). It slows down simple abuse. For hard limits use Upstash Redis / Vercel KV.
7. **Logo:** no logo file was attached to your brief. Put the original at `public/logo.png`. Until then a plain typeset "ULTRAPRO / Paper Bag Company" is shown. That fallback is not the logo.

## Setup

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev
```

### 1. Firebase console (project `ultra-pro-bag-design`)
1. **Authentication → Sign-in method → Email/Password: enable.** Do not enable anything else.
2. **Project settings → General → Your apps → Web app:** copy `apiKey` and `appId` into `.env.local`.
3. **Project settings → Service accounts → Generate new private key.** Copy `project_id`, `client_email`, `private_key` into the `FIREBASE_ADMIN_*` variables (keep `\n` escapes). Never commit this file.
4. **Realtime Database → Rules:** paste `firebase-database.rules.json`, or `firebase deploy --only database`.
5. Authentication → Settings → Authorized domains: add your production domain.

### 2. Create designer accounts (no public sign-up)
```bash
npm run designer:create -- --email admin@yourco.com --name "Owner" --role admin
npm run designer:create -- --email asha@yourco.com --name "Asha"
npm run designer:create -- --email asha@yourco.com --deactivate
```
The script prints a one-time link where the designer sets their own password. No passwords are in the code. Roles and active status can only be written with the Admin SDK (rules deny all client writes to `designerProfiles`).

### 3. Formspree
Endpoint is read from `NEXT_PUBLIC_FORMSPREE_ENDPOINT` (pre-filled with the one you gave). In the Formspree dashboard, add your production domain under allowed domains if available on your plan, and turn on spam filtering.

## Deployment (Vercel)
1. Push to GitHub, import in Vercel.
2. Add every variable from `.env.example` (server variables **without** `NEXT_PUBLIC_`).
3. Deploy, then add the Vercel domain to Firebase authorized domains.
4. Run the checklist in `TESTING.md` on the live URL.

## How a submission works
1. Browser validates, then `POST /api/requests`. The server re-validates, rate-limits, checks the honeypot and minimum fill time, generates the request ID and timestamps, and writes `designRequests/{id}` with the Admin SDK. A hashed draft key (`requestKeys/`) makes retries idempotent.
2. Browser sends the text-only copy to Formspree.
3. Browser tells the server the delivery result (`/api/requests/delivery`, needs the secret draft key).
4. Only when 1 and 2 both succeeded: draft is cleared and the success page opens. If 1 fails nothing is sent. If 2 fails the user sees a partial-failure panel with **Retry sending**, **Download request package** and **Copy summary**.

## Security summary
- Database default-deny. Clients (designers) can only: read requests/notes/versions when active; change `status`, `assignedDesignerUid` (self or admin), `updatedAt`; create notes/versions as themselves; edit/delete their own (admin any). Everything else is Admin SDK only.
- Request creation is server-side only. Visitors have no database access.
- Route guards are a UX layer. Real enforcement is the database rules.
- No `dangerouslySetInnerHTML`; user text is rendered as text. WhatsApp/tel links are built only from validated digits.
- `/designer/*` is `noindex`.

## Files
```
src/app/…                    pages + API routes
src/components/request/…     client form steps
src/components/designer/…    auth, shell, workspace
src/lib/…                    schema, phone, panels, brief, pdf, formspree, package
firebase-database.rules.json database rules
scripts/create-designer.mjs  secure provisioning
tests/lib.test.ts            unit tests (npm test)
```
