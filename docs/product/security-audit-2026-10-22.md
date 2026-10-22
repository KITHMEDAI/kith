# Kith Workspace: security & privacy audit (2026-10-22)

Scope: work.kith.space (workspace edition). There were 4 parallel read-only audits:
- auth and sessions
- data isolation
- privacy and retention
- injection, abuse and dependencies

Key findings were re-verified in code. No production requests were made. Items 1–10 are fixed and deployed; items 11–20 are fixed in code (see the two status sections below).

**Bottom line:** there is no cross-user read path today. RLS plus `user_id` filters hold everywhere, Ask included, and there is no XSS and no leaked secret. The serious risks are:
- account pre-takeover at sign-up
- users writing server-owned columns directly
- unbounded AI spend
- privacy-page claims the code doesn't back up

## Status: "fix now" items 1–10 are FIXED (2026-10-22)

| # | What changed |
|---|---|
| 1 | Sign-up emails a one-time code (`/api/w/auth/signup` → `/api/w/auth/verify`). The account can't sign in until verified, and **the password is set only at verification**, by whoever holds the code. Existing emails get the identical response, plus a "you already have an account" email. Terms notice added. |
| 2 | `/api/w/auth/confirm` deleted. |
| 3 | Migration `003_security_hardening.sql`: clients get SELECT only (+ DELETE on notes) and the anon key gets nothing. Every write goes through the API with the service role, scoped to the signed-in user. Search RPCs are caller-scoped with a fixed search_path. `processNote` re-validates audio paths against the owner. Strict path format. |
| 4 | Persistent Postgres rate limiter (`ws_rate_hit`, `lib/workspace/rate.ts`), hourly + daily per user on notes, retry, revise, edit, ask, search, profile, token, upload; per IP + email on sign-up/verify. Retry capped at 3 attempts per note. |
| 5 | Audio refs cleared *before* Deepgram (no re-billing). 150 s Deepgram timeout. 50 MB bucket cap. Daily 8 h per-user budget of re-transcribed minutes (charged by real duration). Token-mint limit lowered (30/h). |
| 6 | Audio deleted on every rejection path, on note DELETE, and on typed notes. Delete errors are checked. Recorder validates before upload. Daily cleanup (keep-alive cron) plus a per-user sweep on upload remove leftovers older than 30 min and fail stuck notes. |
| 7 | `mip_opt_out=true` on live and pre-recorded Deepgram calls. |
| 8 | Privacy Policy rewritten against the APPs (recordings, every processor, India access, retention, access and correction, breach, OAIC complaints, sensitive info). New `/terms`. Acceptance shown at sign-up, Google sign-in and onboarding; recorded as `ws_profiles.terms_accepted_at`. |
| 9 | CSP (`frame-ancestors 'none'`, locked connect-src), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (mic/display-capture self only), COOP, HSTS. Workspace edition only. Vercel Analytics removed from the workspace. |
| 10 | Next.js 14.2.15 → 14.2.35. `remotePatterns` empty in the workspace. |

Also fixed along the way:
- prototype-key enum bypass (#17)
- PATCH schema and size validation (#18)
- encryption now fails closed in production (#12)
- generic error messages (#20)
- timing-safe cron secret (#20)
- search query capped (#15 part)

Quality evals after the fixes (2026-10-22), same suites as 2026-10-21:

| Suite | After | Before | Notes |
|---|---|---|---|
| Smoke | pass | pass | Ask through the new caller-scoped search RPCs |
| Notes | 50/70 | 52–54/70 | within normal run-to-run variance (±5) |
| Ask | 57/62 | 59/62 | clock pinned to 21 Oct, the day the eval corpus was written for; **isolation 7/7, zero foreign notes**. An unpinned run scored 55/62, the drop coming from "yesterday / last week" questions whose correct answer shifted by a day. |
| Revise | 10/10 | 10/10 | |
| Edge | 25/29 | 23/29 | |
| Recording | 3/10 | 4/10 | strict judge on synthetic audio; one case either way is normal |

Regression tests:
- `scripts/workspace-test/security-check.ts` (38 checks)
- `scripts/workspace-test/signup-check.ts` (9 checks)

## Status: "fix soon" items 11–20 are FIXED in code (2026-10-22, not yet deployed)

| # | What changed |
|---|---|
| 11 | **Field-level encryption of all note text** (`lib/workspace/crypto.ts`, `note-fields.ts`). Encrypted: title, summary, content (an encrypted JSON string in the JSONB column), custom note description, input/transcript and style notes. Format: AES-256-GCM, key derived once per process from `ENCRYPTION_SECRET` (unchanged), prefix `e2:`. Old `enc:` and plain rows still read. `search_text` is now a **blind index**: each word is normalised (lower case, simple plurals), then replaced by a keyed HMAC spelled in letters a–p, so the existing full-text RPCs still match and rank with no schema change. Ask, the list, search, the note page and export decrypt on the server after the user-scoped query. The privacy page now describes this exactly (account details are *not* field-encrypted, and it says so). |
| 13 | **Per-recording consent.** New `ws_notes.recording_consent_at`. `POST /api/w/notes` refuses a recorded note without `recording_consent: true` (422, audio deleted). The recorder asks before *every* recording; one confirmation is used up by the recording it starts. The profile-level `/api/w/consent` route was removed. |
| 14 | **No more raw edits in prompts.** `ws_note_edits` is dropped (migration 004) and no longer written. A manual edit now updates short, generic, encrypted **style notes** on the profile (`learnStyle`, Haiku). The prompt forbids names, places, dates, numbers and case facts; only bullet lines are kept, then masked. Revisions ("add details…") are content and don't train style. |
| 15 | **Search out of URLs.** The notes page searches via `POST /api/w/search`. "Ask your notes" gets the question through `sessionStorage`, and `/ask?q=` is gone. Analytics was already removed. **Sentry is disabled for the workspace edition** in `instrumentation.ts`, whatever `SENTRY_DSN` is set to. |
| 16 | **Self-serve data rights.** Profile → *Your data & security*: **Download my data** (`GET /api/w/account/export`: profile, style notes, every note decrypted with its original input and consent time), **Delete account** (`POST /api/w/account/delete`: type your email to confirm; same-origin only; deletes every file in the user's storage folder, then the auth user, which cascades to profile and notes). Each note has **View transcript / original typed notes** (`GET /api/w/notes/[id]/transcript`). |
| 19 | **Password reset** (`/api/w/auth/reset`): an emailed code, the same shape as sign-up, with an identical answer for unknown emails. It keeps this browser signed in and signs out every other device. **Sign out everywhere** (Profile, `scope=global`). **Turnstile CAPTCHA** on sign-up / reset / sign-in. It is off until the keys are set (see the list below). |
| 20 | **Sign-out is POST-only** and same-origin (GET → 405, other origin → 403). The **middleware matcher** now always runs on `/api/:path*`, so `/api/patients/x.png` returns 404 in the workspace. **Card / TFN / Medicare numbers are masked before every AI call**: generate input, revise (note, input and request), Ask context and style learning. The signed audio URL was already 300 s. |

**Bug found and fixed along the way:** sign-up verification set the password through the admin API, and Supabase revokes *every* session on an admin password change. So people were silently signed out right after verifying, and had to sign in again. Both verify and reset now set the password as the user (`updateUser`), which keeps this session and revokes the others (`lib/workspace/auth.ts`).

**Deploy order (needs your OK; none of it is done):**
1. Run `supabase/workspace/004_privacy_fixes.sql` in the Sydney SQL editor. It adds `recording_consent_at` and `style_notes`, and **drops `ws_note_edits`**. It is safe with the old code still live.
2. Deploy (command in `kith-workspace-launch-checklist.md`).
3. Encrypt existing rows: `npx tsx --env-file=.env.workspace --env-file=.env.workspace.generated scripts/workspace-test/encrypt-backfill.ts` (dry run), then add `--apply`. Until this runs, old notes are still plain text and only semantic search finds them.
4. Optional CAPTCHA:
   - Cloudflare → Turnstile → add a site for work.kith.space.
   - Vercel env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, then redeploy.
   - Supabase → Auth → Attack Protection → enable CAPTCHA (Turnstile, same secret). This protects direct password sign-in.

Regression tests (run against the local dev server on the Sydney DB):
- `signup-check.ts`: **20/20** (sign-up, live session after verify, reset, sign out everywhere). Steps that need a CAPTCHA report SKIP when CAPTCHA is on.
- `security-check.ts`: **65/69 before migration 004**. The 4 that fail need 004: the edit table is gone, style notes can't be written directly, transcript, export. Now run with `--env-file=.env.workspace --env-file=.env.workspace.generated`. It signs users in by emailed-code equivalent and calls the API with their session cookie, and covers encryption at rest, the blind index, consent, search, export, transcript, account deletion, sign-out CSRF and the matcher.

## Fix now (before Steve or anyone outside uses it)

| # | Sev | Issue | Where | Fix |
|---|---|---|---|---|
| 1 | High | **Pre-account takeover.** Sign-up creates an *already-verified* account for any email. When the real owner later clicks "Continue with Google", Supabase links them into the attacker's account, and the attacker reads everything. | `app/api/w/auth/signup/route.ts:28` (`email_confirm: true`) | Verify email (6-digit code) before the account works. Generic response for existing emails. Supabase: "Confirm email" ON, check linking settings. |
| 2 | Med | **Login CSRF.** The old magic-link `confirm` route is still live. A crafted link silently signs a victim into the attacker's account. | `app/api/w/auth/confirm/route.ts` | Delete the route. Disable the email-OTP provider if it's unused. |
| 3 | High | **Users can write any column of their own rows** through PostgREST (anon key + their JWT): `status`, `audio_paths`, `input_enc`, `field_profile`… This bypasses the input cap, rate limits, the encryption guarantee and the audio-ownership check. Polish then signs and deletes *any* path in the bucket. | `001_workspace_schema.sql:67-77` (`FOR ALL`), `lib/workspace/polish.ts`, `server.ts processNote` | Migration 003: clients SELECT/DELETE only, plus a narrow UPDATE on content/title/summary (column grants). All other writes go through the API with the service role. Re-check `audio_paths` start with `note.user_id/` in `processNote`. Tie `ws_note_edits.note_id` to the owner. |
| 4 | High | **Unbounded AI spend.** Ask has no rate limit (about $0.08/call). Retry has none (up to about $0.50/call). PATCH/profile/search have none. All limits are an in-memory `Map`, so they reset on every Vercel cold start. | `app/api/w/ask/route.ts`, `notes/[id]/route.ts:65`, `lib/rate-limit.ts` | Persistent limiter (Postgres counter RPC, no new vendor), keyed per user and per IP. Limits on ask, retry (plus attempt counter), PATCH, profile, search. Daily per-user budget. Deepgram + Anthropic usage caps/alerts in their dashboards. |
| 5 | High | **Deepgram denial of wallet.** Audio duration and size are never checked (the bucket allows 200 MB). The Deepgram fetch has no timeout. A function killed at 300 s keeps `audio_paths`, so every retry re-bills the same file. | `polish.ts`, `002_audio_polish.sql:13`, `upload-url` | Clear `audio_paths` before calling Deepgram. AbortSignal timeout. Cap file size at about 25 MB and check it against the duration. Lower the token-grant limit. |
| 6 | High | **Recordings can be kept forever** (contradicts "deleted right after transcription"). This happens on note-create failure after upload, a closed tab, a killed function, note DELETE, a silently failed `remove()` (supabase-js returns `{error}`, it doesn't throw), or account deletion. | `polish.ts:104`, `NewNote.tsx:74,130`, `notes/[id]` DELETE | Hourly cron sweeping unreferenced `ws-audio` objects older than 2 h. DELETE removes audio. Check `remove()` errors. Run validation before upload. Also a cron that fails stuck "processing" notes. |
| 7 | High | **False privacy claim.** "Providers do not use your data to train their models", but Deepgram is not opted out (`mip_opt_out` is never sent) and the Voyage opt-out is unverified. | `polish.ts`, `lib/copilot/deepgram-stream.ts`, `app/w/privacy/page.tsx:19` | Add `mip_opt_out=true` to both Deepgram calls. You: Voyage dashboard opt-out. |
| 8 | High (legal) | **Privacy page is incomplete for the Australian Privacy Principles (APPs).** Missing: audio storage, Vercel/Sentry/Google/Supabase as processors, edit history reuse, retention periods, access/correction, complaints and the OAIC (Office of the Australian Information Commissioner), health info (APP 3.3), India operator access (APP 8, cross-border), breach process. **No Terms page** (`/terms` 404s) and no acceptance is recorded at sign-up. | `app/w/privacy/page.tsx`, missing `app/w/terms` | Rewrite the privacy page against APP 1.4/5, add Terms, add a "By creating an account you agree…" line with the accepted-at timestamp stored. |
| 9 | Med | **No security headers.** The app can be framed (clickjacking on delete/record/consent), there's no CSP, and session cookies are readable by JS (Supabase default), so any XSS = 400-day account takeover. | `next.config.js` | Add CSP (incl. `frame-ancestors 'none'`), X-Frame-Options, Referrer-Policy, Permissions-Policy (mic/display-capture self), nosniff, HSTS. |
| 10 | Med | **Next.js 14.2.15** has many advisories (middleware bypass CVE-2025-29927, RSC DoS, image optimizer). `remotePatterns` allows *any* `*.supabase.co`. | `package.json`, `next.config.js` | Bump to 14.2.35. Narrow or remove `remotePatterns`. |

## Fix soon (first week)

| # | Sev | Issue | Fix |
|---|---|---|---|
| 11 | High→Med | **Notes themselves are plain text in the DB** (title/summary/content/search_text/edits). Only the raw input is field-encrypted, so the privacy-page "additionally encrypted" claim reads as broader than it is. | Short term: reword the claim accurately. Later: encrypt content and edits (search moves to embeddings + app-side decrypt). |
| 12 | Med | Encryption **fails open**: missing `ENCRYPTION_SECRET` means plaintext is stored silently, and decrypt failure returns `''`. | Throw in production. Log failures without content. |
| 13 | Med | Recording consent is one timestamp per profile, set before the POST succeeds, never checked server-side. | Per-recording consent stored on the note, required by `/api/w/notes`. |
| 14 | Med | Edit before/after text is kept invisibly and **injected into prompts for other clients' notes** (cross-client leakage into the AI and potentially into a note). | Strip identifiers, or replace with a style summary. Cap retention. Disclose. |
| 15 | Med | Search `?q=` (e.g. "John pressure injury") lands in URLs, Vercel logs and Vercel Analytics, which is on every workspace page and not disclosed. Sentry is possibly active and unscrubbed. | Strip query in Analytics `beforeSend` or drop Analytics on workspace. Unset `SENTRY_DSN` on the workspace project or scrub it. |
| 16 | Med | No self-serve account deletion or full export (APP 12). Deletion leaves audio in storage. | Delete-account button (storage prefix + auth user). JSON export. "View transcript". |
| 17 | Med | Enum checks accept `toString`/`constructor` (prototype keys), producing permanently failed notes. | `Object.hasOwn` / Map. |
| 18 | Med | PATCH `content` is unvalidated arbitrary JSON (crash and self-DoS, embed cost). | zod schema with size limits. |
| 19 | Med | No CAPTCHA on sign-up/sign-in, and no password reset or "sign out everywhere". | Turnstile (Supabase native). Reset flow. Global sign-out option. |
| 20 | Low | Account enumeration (409 "already exists"). GET sign-out is CSRF-able. Raw DB/Anthropic errors returned to clients. Cron secret not timing-safe. Middleware static-extension matcher reaches therapist APIs (`/api/patients/x.png`). Masking only on output. Signed audio URL lasts 900 s. | Generic errors. POST sign-out. `timingSafeEqual`. Tighten matcher. Mask input. 300 s URL. |

## You need to check / do (dashboards; I can't)

- **Supabase (Sydney) → Auth:**
  - "Confirm email" ON
  - minimum password 8 + leaked-password protection
  - redirect URLs only `https://work.kith.space/**` (+ localhost), no `*.vercel.app` wildcard
  - disable unused providers (magic link / OTP)
- **Supabase SQL:** run `select * from pg_policies where schemaname='storage';` and confirm there are no broad policies on `storage.objects`.
- **Voyage dashboard:** opt out of training.
- **Deepgram / Anthropic:** set usage caps and alerts.
- **Vercel (workspace project):** `SENTRY_DSN` no longer matters (Sentry is off in the workspace edition in code), but unset it anyway.- **Before real client data:**
  - paid Supabase plan (backups)
  - breach-response note (NDB: assess within 30 days, notify the OAIC)
  - domain contact email instead of Gmail

## Verified fine

- RLS on all 3 tables with `auth.uid() = user_id` (USING + WITH CHECK)
- RPCs are SECURITY INVOKER
- no IDOR in any route
- Ask retrieval scoped on every path
- Upload paths built server-side
- Bucket private
- No XSS sinks (no `dangerouslySetInnerHTML`; markdown renders escaped React)
- No SSRF
- No open redirects; OAuth uses PKCE
- `getUser()` used, not `getSession()`
- Every `/api/w/*` route guards itself
- dev-audio and `/preview` are off in production
- USE_MOCK fail-open is unreachable in workspace
- No secrets in tracked files or git history
- Deepgram master key never reaches the browser
- `Cache-Control: no-store` on data APIs
- No localStorage or service worker
- Prompt injection only affects the user's own output
