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

## Still to do
1. 👤 **DNS** (Claude was blocked from changing DNS). kith.space isn't in the GoDaddy account
   signed in to Chrome, so log in to the account that owns it and add:
   **Type CNAME · Name `work` · Value `cname.vercel-dns.com` · TTL default**.
   Vercel then issues HTTPS automatically (a few minutes).
2. 👤 **Live recording test** (needs a human voice): on work.kith.space → New note → Record →
   talk ~30 s → stop.
3. 👤 Optional Google sign-in: Supabase → Auth → Providers → Google (client ID/secret from
   Google Cloud `kith-498416`, add Supabase's callback URL to the OAuth client), then ask Claude
   to set `NEXT_PUBLIC_WS_GOOGLE=true` and redeploy.
4. 👤 Confirm the deletion contact on the privacy page (`hello@kith.space`).
5. 👤 Optional demo data: `npx tsx --env-file=.env.local scripts/workspace-test/seed-demo.ts <your email>`
   (after you've signed up on work.kith.space).
6. 👤 Review and send the email to Steve.

Test account in the Sydney DB: `workspace-test@kith.space` (field: Mining safety officer, 1 note).
