# Email to Steve: working version of Kith Workspace (DRAFT, not sent)

Send only after the end-to-end test on work.kith.space passes.

**Subject:** Kith Workspace: working version for you to try

Hi Steve,

Following our call, I've built the version we talked about: Kith as a general AI
note-taker rather than a therapy tool. It's ready for you to try:

**https://work.kith.space**

**Try it in 3 minutes**
1. Click **Create account** and sign up with your email and a password.
2. Pick your field. There's a list (NDIS, aged care, construction, pharma, councils,
   hospitality, retail, agriculture and more), "General", or type your own and
   Kith learns how notes are written in that line of work.
3. Choose a note type (a sensible default is pre-selected), then hit **Record** or
   **Type / paste** some rough notes. You get a structured note in about 20 seconds,
   with action items, decisions and anything that needs a second look flagged.
4. After a few notes, open **Ask** and ask a question across them, e.g. "What are
   my open action items?". Answers link back to the source notes.

**What it does well already**
- Only uses what was said or typed. Missing details are listed rather than guessed.
- Flags safety, incident, compliance and adverse-event items for a human, and
  never diagnoses or decides.
- Learns each user's style from their edits.
- Works on phone and desktop.

**Where the data lives (straight answer, like before)**
- Accounts and notes are stored in **Australia (Sydney)**, encrypted.
- For this pilot version, the AI writing, live transcription and search indexing
  are still processed by US providers (Anthropic, Deepgram, Voyage). Moving those
  to Australian regions is the next infrastructure step, and I'd prioritise it as
  soon as we have a pilot organisation that needs it.

**What I'd love from you**
- Use it for a few real (non-sensitive) notes in the fields you care about.
- Tell me which 1–2 sectors you'd take it to first and what's missing for them.
- Your thoughts on the next step: the one-page pilot outline and the principles we
  discussed, which I can send over this week.

As discussed, it'd be great to have a simple mutual NDA in place as we go deeper. I
can send a standard one.

Cheers,
Anurag

---
Notes for Anurag (don't send):
- Don't send before: you've created your own account on work.kith.space and done one
  recorded note (live mic) + one typed note + one Ask.
- Optionally seed your own account with demo construction notes
  (`scripts/workspace-test/seed-demo.ts`) to show Ask on a screen share.
- Vercel Hobby is non-commercial. Upgrade the kith-workspace project to Pro before real
  paying customers.
