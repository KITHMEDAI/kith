const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kith.space';

export function unsubscribeFooter(leadId: string): string {
  return `\n\n—\nDon't want these? Unsubscribe any time: ${BASE_URL}/api/leads/unsubscribe?id=${leadId}`;
}

export interface NurtureStep {
  subject: string;
  body: string;
  /** Days after this step sends before the next one is due. null = sequence ends here. */
  nextDelayDays: number | null;
}

// Runs after the immediate lead-magnet delivery email (see lib/lead-magnets.ts,
// sent at signup time, not part of this array). Indexed by leads.nurture_step —
// the cron sends NURTURE_SEQUENCE[nurture_step], then increments.
export const NURTURE_SEQUENCE: NurtureStep[] = [
  {
    subject: 'One thing that actually changes note-writing time',
    body: `A quick follow-up to the template pack — the part that actually saves time isn't the template itself, it's not typing during the session at all.

That's the idea behind ambient transcription: the session gets transcribed as it happens — in person from your device's mic, or online via a notetaker that joins the call — and the transcript gets compressed and structured into a note afterward, instead of you writing it from memory later.

If you're curious how that actually works (and what it doesn't do — it's not a substitute for your own review), here's a plain walkthrough: https://kith.space/blog/ambient-session-transcription

No pitch in this one — just the read, in case it's useful.`,
    nextDelayDays: 4,
  },
  {
    subject: 'What Kith actually does (the honest version)',
    body: `Last one in this short series — so here's the direct version.

Kith is what the last two emails have been describing: ambient transcription (in-person or over Google Meet), AI-drafted SOAP notes you review and edit, and conflict-checked scheduling. Free to start, no card required.

What it isn't: a finished, polished-marketing product with every feature under the sun. It's built by a small team, and it's honest about what it does and doesn't do yet — which is really the same standard this email series has tried to hold itself to.

If it's useful, it's here: https://kith.space/register
If it's not for you right now, no hard feelings — and this is the last email in this sequence either way.`,
    nextDelayDays: null,
  },
];
