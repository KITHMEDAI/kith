# Kith Workspace: launch checklist

Status as of 2026-10-21. ✅ done by Claude · 👤 needs Anurag · 🤝 Claude does it once Anurag unblocks it

## Done
- ✅ Code: onboarding, New note (type + record/type), field-aware notes, notes list +
  search, note view (edit / copy / PDF / delete / retry), Ask your notes (RAG), privacy page.
- ✅ Note engine tested on construction, pharma, NDIS, general and a custom field.
- ✅ UI checked on desktop and mobile (dev preview at `localhost:8090/preview`).
- ✅ Vercel project **kith-workspace**: Next.js, functions in **Sydney (syd1)**,
  env vars set (AI keys, new ENCRYPTION_SECRET + CRON_SECRET, edition = workspace).
  Secrets mirrored locally in `.env.workspace.generated` (git-ignored, **never change
  ENCRYPTION_SECRET**).
- ✅ Test build deployed on Vercel successfully (project id `prj_pp2ZevEuQuGawLMF56A0N2auWQxj`,
  team `team_WozlQe4hPVRQSwjmmIKlK5ow`). Deploy with:
  `VERCEL_ORG_ID=team_WozlQe4hPVRQSwjmmIKlK5ow VERCEL_PROJECT_ID=prj_pp2ZevEuQuGawLMF56A0N2auWQxj vercel deploy --prod`
  (never `vercel link` in this repo; it's linked to the kith.space project).
- ✅ Domain **work.kith.space** added to the Vercel project (waiting on DNS).
- ✅ Daily keep-alive cron so the free Sydney database never pauses.
- ✅ Scripts: `setup-check.ts` (verifies DB + security), `seed-demo.ts` (demo notes).
- ✅ Email draft to Steve: `docs/partnerships/steve-agi-c51/email-to-steve-workspace.md`.

## Done 2026-10-21 (session 2)
- ✅ Sydney Supabase project **kith-workspace** created (ref `kwoskqcdbqdybpttmhto`, ap-southeast-2).
  `.env.workspace` written. The DB password was auto-generated and not stored; reset it in
  Supabase if ever needed (the app doesn't use it).
- ✅ Schema applied; `setup-check.ts` all green (tables, search functions, RLS blocks anon).
- ✅ Auth: Site URL `https://work.kith.space`; redirect URLs `https://work.kith.space/**`,
  `http://localhost:8090/**`.
- ✅ Sign-in email is sent by the app itself via Resend (`/api/w/auth/magic` →
  `/api/w/auth/confirm`), so **no Supabase SMTP setup is needed**. Tested with Resend's test inbox.
- ✅ Google button hidden until `NEXT_PUBLIC_WS_GOOGLE=true` is set (after configuring Google).
- ✅ Local end-to-end on the real Sydney DB: sign-in link → onboarding with custom field
  ("Mining safety officer" → AI field profile) → typed incident report → note page →
  search → Ask (cited answer) → edit. Input encrypted, note embedded.
- ✅ Vercel env complete; **production deployment READY** on project kith-workspace.

## Live (2026-10-21)
- ✅ DNS: GoDaddy CNAME `work` → `cname.vercel-dns.com`; certificate issued; **https://work.kith.space is live**.
- ✅ Live checks: sign-in page, redirect when signed out, therapist API 404, dev preview hidden,
  sign-in email sends (Resend test inbox), sign-in link → app, typed meeting minutes → note in
  ~22 s (3 actions, 3 flags), Ask across 2 notes with citations in ~6.5 s.

## Sign-in changed to email + password (2026-10-21)
- The email-link sign-in was replaced: the login page has **Sign in / Create account** with
  email + password. Accounts are created already confirmed (`/api/w/auth/signup`), so no
  email is ever needed. Duplicate sign-up → "already exists, sign in instead". Old
  `/api/w/auth/magic` removed. Verified live. Test accounts cleaned up.
- No password reset yet (it would need email). If someone forgets, reset it in Supabase →
  Authentication → Users.

## Still to do
1. 👤 **Live recording test** (needs a human voice): work.kith.space → New note → Record → talk ~30 s → stop.
3. ✅ Help/contact email set to kithmedai@gmail.com (privacy page, account menu, sign-in footer).
4. 👤 Sign up with your own email on work.kith.space; optionally seed demo notes:
   `npx tsx --env-file=.env.local scripts/workspace-test/seed-demo.ts <your email>`.
5. 👤 Review and send the email to Steve.

Test account in the Sydney DB: `workspace-test@kith.space` (field: Mining safety officer, 2 notes).
Known: note generation takes ~15–22 s (Sonnet; progress stages shown). Could be sped up later by streaming.
