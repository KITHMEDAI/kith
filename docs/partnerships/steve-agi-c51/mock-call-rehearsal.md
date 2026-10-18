# Mock call rehearsal (2026-10-18)

Claude played Steve. These are the model answers and coaching notes, in the order
the questions are likely to come.

---

## Q1. "Who's Anurag, why did you build Kith, where's it at? The honest version."

Structure: who → why → what it does → honest status → why this call. ~60–75 sec.

> "I'm Anurag, based in Bengaluru. By day I'm a data engineer at Samsung R&D, so my
> background is building data systems that have to be reliable and secure.
> I started Kith because therapists spend hours after sessions writing notes, often
> unpaid, and it burns them out. A practitioner records a session or types rough notes,
> and Kith turns it into a structured clinical note they review and sign off.
> I've built the whole thing myself; it's live in production: real transcription, a
> two-stage AI pipeline, encryption, access control, even billing.
> Honest version: the product works, but we haven't found our market yet. No paying
> customers. I've been building more than selling, and that's the wrong order.
> That's why your message caught my attention. You know the Australian market and NDIS;
> I have a working engine."

- Samsung background answers "security foundations" early.
- State "no customers" calmly as a fact; don't apologise.
- Don't list every feature. Save "part-time" for when he asks about commitment.

## Q2. "Support worker writes: 'Took J to shops, had lunch, J was a bit agitated in arvo, gave PRN, settled. Watched TV.' How does Kith turn that into a case note, and stop the AI making things up?"

> "Kith turns it into a structured note in the provider's format: support given, how J
> went, and which of J's plan goals it links to (shops → community access).
> On making stuff up, three rules:
> 1. It only uses what the worker wrote. If the note doesn't say why J was agitated or
>    what PRN was given, Kith flags it as missing and asks: trigger? medication, dose, time?
> 2. Nothing is final until a human approves it.
> 3. Flags, not decisions. 'Gave PRN' because J was agitated could be a chemical
>    restraint, a restrictive practice, possibly reportable. Kith shouldn't decide that,
>    but should raise it for the team leader.
> Built today: rough notes → structured note with human review. The NDIS layer (goal-
> linking, missing-info prompts, restrictive-practice flags) is pilot build work."

- PRN = "as needed" medication. Given for agitation, it can be a chemical restraint.
  Catching this shows domain understanding.
- ABC = antecedent → behaviour → consequence (standard behaviour documentation).
- Never claim "our AI doesn't hallucinate".

## Q3. "Where does the data live? Stack, hosting, which AI? Is participant data staying in Australia?"

> "Straight answer: today, no. Kith runs outside Australia, mainly on US infrastructure.
> Stack: Next.js on Vercel, Postgres on Supabase, Anthropic's Claude for notes, Deepgram
> for speech-to-text.
> For an Australian pilot I'd deploy a separate Australian instance: database in Sydney,
> app in Sydney, AI through AWS in Sydney (Claude models are available there). A
> deployment change, not a rebuild.
> Suggestion: start with typed notes only. Support workers already type on their phones,
> and it removes audio and recording consent from the first pilot.
> Security: encrypted in transit and at rest, extra field-level encryption, strict access
> control. Not yet: an audit log and certifications like ISO 27001. For the pilot I'd add
> the audit log, plus a privacy impact assessment and an Essential Eight self-assessment."

- Check the Supabase region before the call.
- Voice later: AWS Transcribe / Azure Speech run in Sydney.
- Never say "end-to-end encrypted".

## Q4. "C51 has a working concept for AI case notes. Providers like it but I wouldn't put real data in it. How does Kith fit without building the same thing twice?"

> "You've done the hard market part: talked to providers, know what they want, have a
> concept they react to. What I've built is the hard production part: the engine you'd
> trust with real participant data. So rather than two products, one: your market
> insight and provider relationships, running on Kith's engine. Whatever's working in
> your concept, we keep.
> I'd love to see it. What did providers react to most? Has anyone used it with real
> notes? What's it built on?"

- Trust test: does he name it, offer to show it, describe it accurately?
- Never call his demo "just a demo" or a "wrapper". Don't reveal we've seen it.
- If he proposes white-label under his brand only: "Open to it; let's work out
  branding when we do the structure."

## Q5. "Who's on your team? Full-time? Who picks up at 2pm Melbourne on a Wednesday?"

> "It's me: a solo founder, building Kith alongside my full-time job. I can commit 15 to
> 20 hours a week, consistently. Judge delivery by what already exists.
> Support: 2pm Melbourne is 8:30am for me, so I'm available. Agreed response times in
> writing, e.g. urgent issues acknowledged within 2 hours in AU business hours. Error
> monitoring. And in a typed-notes pilot, if Kith is down, workers write notes the normal
> way, so nobody's care is affected.
> If the pilot turns into real revenue, I scale my time and bring on help."

- If asked "what if you get sick or busy?": code in a private repo with documentation,
  plus a handover doc for the pilot (only if you'll actually do it).
- Don't claim a team. Don't promise 24/7.

## Q6. "We'd need exclusive rights for Australia (at least NDIS), and anything we build together jointly owned."

> "In principle, open to both.
> Exclusivity: happy to give C51 exclusive NDIS rights in Australia, tied to
> milestones, e.g. a pilot provider signed within a few months, and N paying customers
> within a year. If things stall, neither of us is stuck.
> IP: Kith's core engine is what I bring; it existed before us and runs in other
> markets, so it stays with Kith and C51 gets the right to use it. What we create
> specifically for NDIS (templates, workflow, brand, your market knowledge) we share
> fairly. 'Jointly owned' can get messy legally, so let's write down exactly who owns
> what.
> Can we agree the principles today and put them in a simple heads of agreement once the
> pilot scope is clear?"

- If he pushes for co-ownership of the engine: "Let me think about it properly
  rather than answer on the spot." **Never agree to engine ownership on a call.**
- Never agree to unconditional exclusivity.

## Q7. "Mid-sized SIL operator in Melbourne, ~40 support workers, first certification audit coming. What does the pilot look like, and when could you have something?"

> "Start small: one or two houses, 5–10 support workers plus their team leader. Typed
> notes only. About 8 weeks of real use.
> Weeks 1–2 discovery: their templates, goal format, de-identified sample notes.
> Weeks 3–8 build: AU hosting, their templates, goal-linking, missing-info prompts,
> team-leader review, audit log. Then 8 weeks live. So something to see in about 6 weeks,
> live with workers in about 8.
> From them: one champion (team leader or quality manager), templates and goal format, a
> few de-identified sample notes, privacy sign-off, 5–10 willing workers.
> From you: the relationship and intro, help running discovery, and agreeing success
> metrics up front: time per note, % of notes goal-linked, team-leader review time.
> Caution: I wouldn't switch on a new tool right before their audit. Position it as
> 'getting notes audit-ready' for the next cycle, or time the pilot to finish well before."

- Never promise audit outcomes. No prices; use the parking line.
- Team accounts and the audit log are build items, not existing features.

## Q8. "Where do we go from here? Next steps both sides?"

> "Let me play back what I heard: NDIS case notes for support workers, typed first, one
> provider, small pilot, Kith as the engine, C51 leading the market side, exclusivity
> tied to milestones, core engine stays with Kith. Fair summary?
> Next steps:
> 1. Me, within a week: a one-page pilot outline and a short note on today's principles
>    as the start of a heads of agreement.
> 2. Both: a simple mutual NDA before sharing anything deeper. I can send one.
> 3. You: walk me through your concept, and an intro to the SIL provider if you're
>    comfortable.
> 4. Then a discovery call with the provider's team leader.
> From you before we next talk: the provider's name, how warm they are, and roughly when
> their audit is. Shall we lock in a follow-up for the week after next?"

- The playback gets him to confirm the key points out loud.
- Whoever writes the documents shapes the deal, so we write them.
- His intro to a real provider is the real test of whether he can deliver.

---

## Five things to remember on the day
1. Honesty first (no customers, part-time, US hosting today), each with a plan.
2. Listen more than you pitch.
3. Typed-notes-first pilot.
4. Core engine stays Kith's; exclusivity only with milestones.
5. We write the follow-up documents, within a week.
