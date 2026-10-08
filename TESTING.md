# End-to-end testing checklist

Automated: `npm test` (phone, panel loops, schema) and `npm run build` pass.
Everything below needs your real Firebase project and Formspree form.

## Client submissions
- [ ] Valid submission: record appears in dashboard; Formspree email arrives; success page shows the ID.
- [ ] Empty brand / name / phone → inline errors, cannot pass step 1.
- [ ] Bad phone (`12345`, `98abc43210`) rejected; `98765 43210`, `+91 98765 43210` accepted.
- [ ] Tick "I don't know my bag size" → dimensions hidden, dashboard shows "Pending confirmation".
- [ ] Known size: `0`, `-2`, `abc`, empty rejected.
- [ ] Untick "Use my contact number on the bag" → separate number required (when "Phone number" is ticked to print).
- [ ] Repeat-panel logic: defaults Front custom, Back→Front, Left designer, Right→Left. Set Front to repeat Back while Back repeats Front: Back is not offered as a source for Front; brief resolves chains (Right→Back→Front shows "via BACK").
- [ ] "Let the Designer Decide": empty custom panels become Designer's Choice, filled ones keep content with layout left to designer.
- [ ] Review page lists warnings (no logo, no colours, pending size), consent required.
- [ ] Double-tap Submit → one request only. Refresh mid-way and retry → same request ID (no duplicate).
- [ ] Formspree failure (turn off Wi-Fi after the first request step, or put a wrong endpoint in `.env.local`): partial panel appears; "Retry sending" works once fixed; no duplicate record; success page only after delivery.
- [ ] Firebase failure (wrong admin key): message says nothing was sent; Formspree is NOT called.
- [ ] Honeypot (fill hidden `website` field via devtools) → rejected. Submit in <8 s of opening form → rejected. 7th request in 10 min from one IP → 429.

## Audio and files
- [ ] Record, pause, resume, stop, play, download, delete, record again; duration shows.
- [ ] Deny microphone permission → clear message, typing still works.
- [ ] Unsupported browser (or `MediaRecorder` removed in devtools) → written fallback message.
- [ ] iPhone Safari and Android Chrome both record (formats mp4 / webm).
- [ ] File of 12 MB, `.exe`, empty file → rejected with message.
- [ ] After submit with files + recording: success page offers package ZIP; ZIP contains summary, JSON, attachments. No text anywhere claims they were uploaded.

## Designers and access
- [ ] Two designer accounts created via script; both can log in and see all requests.
- [ ] Unknown email / wrong password → generic error. Deactivated designer → blocked and signed out.
- [ ] Visit `/designer`, `/designer/requests/ID`, `/designer/profile` signed out → redirected to login.
- [ ] In the Firebase Rules Playground (or emulator): unauthenticated read of `/designRequests` DENIED; unauthenticated write DENIED; active designer read ALLOWED; designer write to `designerProfiles/<own uid>/role` DENIED; designer deleting a request DENIED; designer B editing designer A's note DENIED, admin ALLOWED; designer setting `assignedDesignerUid` to someone else DENIED (admin ALLOWED); status value `"done"` DENIED.
- [ ] Password reset email arrives.

## Request page
- [ ] Sections A–E show correct data; panels badge Client / Designer's choice / Pending / Blank.
- [ ] Status change and assignment persist and show on dashboard.
- [ ] Notes: add, edit own, delete own; cannot edit others'.
- [ ] Design files: unsupported type and >100 MB rejected; images preview; export package works; logged version shows "file not stored".
- [ ] Brief PDF downloads, header/sections correct; Hindi request shows the warning; Print / Save as PDF shows Hindi correctly.
- [ ] Call and WhatsApp buttons open correct `tel:` / `https://wa.me/<digits>`.

## Mobile
- [ ] 360 px width: no sideways scroll, buttons ≥48 px, progress bar and sticky Back/Next usable on keyboard open.
- [ ] Open the link from WhatsApp in-app browser and complete a request.
