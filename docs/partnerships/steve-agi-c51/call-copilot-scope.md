# Live call copilot: scope (draft, 2026-10-18), NOT BUILDING for now (decided 2026-10-18)

Goal: during the 20 Oct call with Steve, a screen beside Google Meet that transcribes
the conversation live and, whenever Steve asks something or uses a key term,
immediately shows suggested answers, definitions and warnings, all grounded in this
folder's docs.

## Legal / etiquette note
- Anurag is a **party** to the call. In Victoria (Steve is in Melbourne) and in India,
  a participant may record or transcribe a private conversation they're part of without
  the other party's consent. Victoria restricts **publishing/sharing** it, so:
  **transcript for Anurag's own notes only, never shared, never published.**
- **No visible meeting bot** (Recall.ai would show as a participant). Everything runs
  locally in Anurag's browser.
- Not legal advice. If ever unsure, a one-line "I use an AI notetaker, all good?" removes the issue.

## Option A: build our own on Kith's existing code (recommended)

Reuses `hooks/useRealTimeTranscript.ts` (Deepgram live streaming, already production-
tested) and the Anthropic client in `lib/claude.ts`.

**How it works**
1. Local-only page in the Kith repo, e.g. `/copilot`, run on the dev server
   (`localhost:8080`), **never deployed**.
2. **Two audio streams = automatic speaker labels:**
   - Steve = the Meet tab's audio, captured with Chrome "Share tab → Share tab audio"
     (`getDisplayMedia`)
   - Anurag = microphone (`getUserMedia`)
   - Each goes to its own Deepgram stream, so no speaker-guessing is needed.
   **Headphones required** (otherwise the mic also picks up Steve).
3. **Three kinds of cards, newest on top, big font:**
   - 💬 **Suggested answer.** When Steve finishes a question or a substantive point,
     Claude Haiku 4.5 (fast) gets the last few minutes of transcript plus all the prep docs
     (FAQ, rehearsal answers, money plan, decisions, due diligence, glossary, Kith facts)
     and streams 2–3 short bullets: "Say: …". Target: card within ~2–3 s.
   - 📖 **Instant definition.** Local keyword match against the glossary (NDIS, SIL, PRN,
     APP 8, heads of agreement…), shown in under 0.5 s with no AI call.
   - 🚨 **Red-line alert.** Local keyword rules, instant: "exclusive", "own the engine",
     "jointly owned", "upfront", "fee", "invoice", "white-label", "retainer" → reminder
     of our position (e.g. "Milestones only. Don't agree to engine ownership").
4. **After the call:** the transcript is saved locally (git-ignored) → Claude drafts
   `call-notes/2026-10-20.md` plus a follow-up email and updates the timeline/decisions.

**Build effort:** about half a day of Claude work today/tomorrow.
**Test:** Monday. Anurag joins a Meet from the laptop and plays an interview video in
the Meet tab (or calls in from his phone), and checks latency, cards and layout.
**Running cost:** a few US$ (Deepgram + Haiku for 45 minutes).
**Privacy:** audio goes only to Deepgram and Anthropic (already Kith's vendors), with
no third-party copilot company.

## Option B: off-the-shelf "AI meeting / interview copilot"
Commercial tools exist that listen to a call and show live answers, usually with a
way to upload your own docs as context (e.g. Cluely, LockedIn AI, Final Round AI).
- ➕ Ready today, no build risk.
- ➖ ~US$20–50/month subscription; generic prompts; audio and call content go to
  another company's servers; less control over red-line alerts; Windows overlay
  behaviour varies by tool. Their exact features weren't verified in this session.

## Practical setup for the call (either option)
- Two windows side by side (or a second screen): Meet on one side, copilot on the other.
  Keep your camera/face pointed at Meet.
- Headphones on.
- **Glance, don't read.** Cards are prompts, not scripts; reading aloud sounds robotic.
- Fallback if anything breaks: `mock-call-rehearsal.md` open in a tab.

## Risks
| Risk | Mitigation |
|---|---|
| Lag or a crash mid-call | Fallback tab; the rehearsal already covers the likely questions |
| Distraction / eyes visibly drifting | Big, short cards; side-by-side layout near the camera; practise Monday |
| Echo / double transcription | Headphones |
| Dev server instability | Start it 15 min early; don't run `npm run build` while it's live |
