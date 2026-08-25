---
title: "Google Meet for Therapy Sessions: A Practical Setup Guide"
description: "A practical guide to running online therapy sessions on Google Meet — link setup, privacy basics, connection backups, and where automatic notetaking fits in."
date: "2026-08-23"
keyword: "online therapy sessions google meet"
category: "Running a Private Practice"
---

If you're running online therapy sessions on Google Meet, you've probably already worked out the basics by trial and error — most therapists do. But there's a difference between "it worked last time" and having a setup you don't have to think about mid-session. Here's a practical walkthrough: how to set up the link, what to check before a session, what to do when the connection drops, and where automatic notetaking fits into the picture without adding another thing to manage.

## Why Google Meet is a reasonable default

Google Meet has a few things going for it that matter specifically for therapy, not just video calls in general. Clients can join from a link in their browser — no account, no app download, no software to troubleshoot on their end, which matters when the person joining is anxious, on an older device, or simply not tech-confident. It integrates natively with Google Calendar, so a session link can live in an invite rather than a message you have to dig up and re-send. And because it's a mainstream consumer product, most clients have already used it for something else, which lowers the "is this actually going to work" anxiety before a first session.

The tradeoff is that Meet itself has none of the practice-management layer you actually need — no patient records, no automatic conflict checking against your other appointments, no clinical notes. It's a video call, not a practice tool. Whether that's fine depends on how you're managing the rest of your practice around it.

## Setting up online therapy sessions in Google Meet

There are two ways to generate a link, and they behave differently:

- **A recurring link from your calendar.** Create a calendar event, add Google Meet as the conferencing option, and reuse that same link for every session with a given client. Convenient, but it means the link stays valid indefinitely — if it's ever shared beyond the intended client, there's no per-session gate stopping someone from joining later.
- **A fresh link per session.** Generated new each time, either manually or by whatever scheduling tool creates the calendar event. More setup friction, but each link has a shorter useful life, which is a meaningful privacy improvement if you're being strict about it.

Either way, a few settings are worth locking in once rather than re-checking every time:

- **Quick access off** for anything involving a new or first-time client, so people can't join just by guessing or reusing a link — they need to be let in explicitly.
- **A waiting room habit**, even without a formal lobby feature enabled: don't start talking until you've confirmed who's actually joined the call.
- **Calendar event visibility set to private**, not just the meeting itself — a calendar invite titled with a client's name is itself a small data leak if your calendar is shared with anyone else, including a receptionist or practice partner.

## Before the session: a short checklist

Most disrupted sessions trace back to one of a small number of causes, and all of them are checkable in under a minute:

1. **Camera and mic permissions**, especially after a browser update — Chrome and Edge occasionally reset site permissions, and it's a bad moment to discover that mid-session.
2. **A wired connection or strong Wi-Fi**, if you have the option. Video quality degrades gracefully in Meet; audio dropouts don't, and audio is the part that actually matters for a therapy session.
3. **A closed-door, headphone setup** on your end, and a reminder to the client (especially early on) to do the same if their situation allows it — the single biggest confidentiality risk in online therapy isn't the platform, it's who else is in the room.
4. **A backup contact method agreed in advance** — a phone number or a way to reach you if the call drops. Simple, but it's the difference between a dropped call being a minor technical hiccup and it feeling to a client like being abandoned mid-session.

## What happens to the recording and notes

If you're using any AI notetaking tool alongside Meet — Kith or otherwise — there's a step here worth being deliberate about rather than assuming it's handled invisibly. Recording an online session and using AI to process what was recorded are two separate actions with two separate ethical and legal weights, and they should be consented to separately, not bundled into one blanket "I agree" at intake.

In Kith specifically, this is built as two distinct consent gates — one for recording the session, one for AI processing of that recording — both required, and both tracked server-side rather than just noted in a paper file. That's a deliberate design choice, not an incidental one: a client can decline AI processing of their session while still consenting to you keeping a plain record, or vice versa, and the distinction is preserved rather than collapsed.

For online sessions, the actual mechanism is a bot that joins the Meet call as a participant (similarly to how a human notetaker would sit in), captures the conversation, and feeds it into the same two-layer note pipeline used for in-person sessions — a first pass that compresses the raw transcript, a second that structures it into a SOAP note, key points, a session summary, and homework. We've covered how that pipeline works in more detail in our [guide to ambient transcription](/blog/ambient-session-transcription); the online version is functionally the same idea, just triggered by joining a call instead of a device microphone.

Worth knowing either way: if you're in India, the DPDP Act governs how you're expected to handle this kind of recorded, structured client data — we cover that separately in our [DPDP 2023 explainer](/blog/dpdp-2023-therapist-notes). If you're in the UK, it's UK GDPR, covered in our [GDPR and AI notetaking guide](/blog/gdpr-ai-notetaking-uk). Neither law is specific to video call platforms, but both apply directly to anything an AI tool generates from one.

## Where Kith fits in — and where it doesn't

If you book a video session directly inside Kith, it creates the Google Meet link automatically as part of the booking — you don't separately open Calendar, add conferencing, and copy a link across. It also checks for scheduling conflicts against your existing appointments before confirming a booking, so double-bookings get caught at the point of scheduling rather than discovered later.

Worth being precise about the calendar piece, since it's easy to overstate: Kith pulls events from your connected Google Calendar in, so it knows what you're already booked for — it doesn't write changes back out to Google Calendar except for creating that one Meet event for a booking made inside Kith itself. If you're managing your real calendar of record in Google Calendar and only sometimes booking through Kith, keep that one-way direction in mind so you don't assume a change made in one place shows up automatically in the other everywhere.

None of this requires a paid plan to try — Kith's free plan covers this without a card up front, which matters if you just want to see whether the workflow fits before committing to anything.

## The honest limitation

None of this replaces good judgment about what a client can safely access. If someone has spotty broadband or shares a computer with family members and no private space to take a session, a slicker video setup doesn't solve that — it's worth having a real conversation with them about whether video is the right format at all, or whether phone, or eventually in-person, serves them better. The setup above will make the technical side close to invisible on a good day. It won't fix a bad-fit modality.
