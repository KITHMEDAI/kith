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

## To do, in order
1. 👤 **Save `.env.workspace`** in the Kith folder (Notepad → Save as → "All files"):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase → Project Settings → API).
2. 👤 **Sign in to supabase.com in Chrome** (the Chrome with the Claude extension).
3. 🤝 Claude, in the Supabase dashboard:
   - runs `supabase/workspace/001_workspace_schema.sql` in the SQL editor
   - Auth → URL configuration: Site URL `https://work.kith.space`, redirect URLs
     `https://work.kith.space/**` and `http://localhost:8090/**`
   - then runs `setup-check.ts` (tables, functions, row-level security)
4. 👤 **Supabase → Auth → SMTP** (Claude fills the non-secret fields; you paste the key):
   host `smtp.resend.com`, port `465`, user `resend`, password = **Resend API key**,
   sender `noreply@kith.space`, name `Kith`. (Without this, sign-in emails are limited
   to a few per hour.)
5. 👤 **Google sign-in** (optional, can ship without): Supabase → Auth → Providers →
   Google: paste the client ID/secret from Google Cloud project `kith-498416`, and
   add the redirect URI Supabase shows to that OAuth client. Otherwise remove the
   Google button before sending.
6. 🤝 **DNS**: sign in to GoDaddy in Chrome; Claude adds `CNAME work → cname.vercel-dns.com`.
7. 🤝 Claude adds the 3 Supabase env vars to Vercel and deploys to work.kith.space.
8. 🤝 End-to-end test on the live site: sign-up, onboarding, typed note, recorded
   note, edit, search, Ask, mobile, sign-out/in.
9. 👤 Optional: `npx tsx --env-file=.env.local scripts/workspace-test/seed-demo.ts <your email>`
   to fill your account with demo notes.
10. 👤 Review and send the email to Steve.
