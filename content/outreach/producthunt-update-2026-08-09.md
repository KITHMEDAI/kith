# Product Hunt Maker Update — 2026-08-09 (ready-to-paste)

Post this as a maker update / comment on the Kith product page, in your own
voice. Covers only what's genuinely new and verified since the last update —
see git commits 2b7228b, 405beb6, 02ce081 for the underlying work.

## Update text

Update from the Kith team 👋

A few things shipped recently that I think are worth sharing:

**Two more note formats.** SOAP and EMDR weren't enough — added DAP and BIRP
too. BIRP specifically because it's the format a lot of agency and
Medicaid-funded practices are required to document in, and that request came
up repeatedly. All four formats now live behind one picker in Settings.

**Real semantic search over session notes.** The notes page used to be a dumb
substring match over patient name + summary. Now it's pgvector-backed hybrid
search (semantic + keyword) — you can search with a paraphrased query that
shares almost no vocabulary with the original note and it still finds the
right session. Tested this against real completed sessions in production, not
just a demo case.

**Treatment continuity.** Note generation now pulls the last 4 sessions
(summary, homework assigned, next-session plan, risk level) before drafting a
new note, so it can flag when something from a prior session's plan never got
followed up on. Small thing on paper, but it's the difference between a note
that describes one session in isolation and one that understands where a
client actually is in treatment.

Still free, still no card required to try any of it. Would genuinely love
feedback if you kick the tires on any of this — kith.space

## Notes for posting
- Post from your own maker account, first person, same as the original launch
  — a personal update reads as real, a company-voice update reads as a press
  release.
- Reply to any comments that come in within the same window if you can —
  that's still what PH's algorithm weighs most, same as launch day.
- Don't mention DAP/BIRP/search/continuity as "AI-powered" buzzwords without
  the specific detail above — PH's audience is builder-literate and responds
  better to the actual mechanism than to adjectives.
