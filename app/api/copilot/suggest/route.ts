import { promises as fs } from 'fs';
import path from 'path';
import { copilotAllowed } from '@/lib/copilot/guard';
import { anthropic } from '@/lib/claude';

// Live call copilot: given the recent transcript, stream 1–3 short "say this"
// bullets grounded in the partnership prep docs. Local-only — see guard.ts.

// Sonnet over Haiku: in testing Haiku broke red lines (conceded the split,
// hinted we'd seen Steve's demo); judgement matters more than ~1 s here.
const MODEL = 'claude-sonnet-4-6';

const DOCS_DIR = path.join(process.cwd(), 'docs', 'partnerships', 'steve-agi-c51');
const CONTEXT_FILES = [
  'call-prep-faq.md',
  'mock-call-rehearsal.md',
  'money-plan.md',
  'decisions.md',
  'due-diligence-summary.md',
  'glossary.md',
];

let cachedContext: string | null = null;

async function loadContext(): Promise<string> {
  if (cachedContext) return cachedContext;
  const parts: string[] = [];
  for (const f of CONTEXT_FILES) {
    try {
      parts.push(`<doc name="${f}">\n${await fs.readFile(path.join(DOCS_DIR, f), 'utf8')}\n</doc>`);
    } catch {
      // A missing doc just means less context, never a failed suggestion.
    }
  }
  cachedContext = parts.join('\n\n');
  return cachedContext;
}

const INSTRUCTIONS = `You are a private, real-time call copilot for Anurag, solo founder of Kith (AI clinical documentation), on a live video call with Steve Agi (C51 / AGI360, Melbourne) about a possible NDIS documentation partnership. Only Anurag sees your output, glancing at it mid-conversation.

The prep docs below are your source of truth: Anurag's agreed positions, model answers, red lines, money principles, Kith's real capabilities and gaps, and due diligence on Steve.

When given the latest transcript, respond to what Steve most recently said or asked.

Output format (strict):
- Output exactly SKIP ONLY for pure pleasantries or one-word acknowledgements ("yeah", "right", "cheers"). For anything with substance (a statement, opinion, idea, question, or him describing his business), ALWAYS give Anurag something live to say or ask next.
- Otherwise output 1–3 bullets, each starting with "• " and AT MOST 14 words. Glanceable key points in spoken phrasing — prompts, not a script, never full paragraphs.
- Optionally one extra final line starting with "⚠ " (max 12 words) for a red line or trap (e.g. engine ownership, open-ended exclusivity, fees, promising audit outcomes, claiming features/customers/certifications Kith doesn't have).
- Optionally one final line starting with "? " (max 14 words) with a smart question Anurag could ask back.
- Whole output under 45 words. Shorter is better: he is mid-conversation.
- No headings, no preamble, no markdown other than the bullets.

Rules:
- Never invent Kith features, customers, team members, certifications or hosting. Stay consistent with the docs' "what's real / what's not" lists — honesty is Anurag's main trust asset with Steve.
- Money: principles only (no upfront fees, revenue share on cash collected, Kith invoices). No numbers on this call, and never concede the direction of the split (e.g. never suggest C51's share should be larger): Kith carries build, hosting, compliance and support.
- Core engine stays Kith's; exclusivity only with milestones; nothing agreed or signed on the call.
- Don't reveal that Anurag has researched Steve's NDIS Documentation Assist demo.
- Typed-notes pilot = no audio recorded; the typed text still goes to Kith's (Australian) servers for the AI. Never say data "never leaves the device".
- If the transcript is garbled, infer the most likely meaning; don't comment on transcription quality.`;

type Seg = { who: string; text: string };

export async function POST(req: Request) {
  if (!copilotAllowed(req)) return new Response('Not found', { status: 404 });

  const body = await req.json().catch(() => null) as { transcript?: Seg[]; ask?: string; warm?: boolean } | null;
  // Page-load warm-up: compiles this route and loads the docs so the first
  // real suggestion mid-call isn't stuck behind a cold start.
  if (body?.warm) {
    await loadContext();
    return new Response('ok');
  }
  const transcript = (body?.transcript || []).slice(-24);
  const ask = body?.ask?.trim();
  if (!transcript.length && !ask) return new Response('Nothing to respond to', { status: 422 });

  const client = anthropic();
  if (!client) return new Response('ANTHROPIC_API_KEY not set in .env.local', { status: 500 });

  const context = await loadContext();
  const convo = transcript.map(s => `${s.who}: ${s.text}`).join('\n');
  const userMsg = ask
    ? `Recent transcript:\n${convo || '(none yet)'}\n\nAnurag privately asks you: ${ask}\nAnswer him directly in under 60 words (bullets ok). Never output SKIP for this.`
    : `Latest transcript (most recent last):\n${convo}\n\nRespond to Steve's most recent words. HARD LIMIT: max 3 bullets of max 14 words each, optional ⚠ and ? lines of max 12 words. Under 45 words total, or SKIP.`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 150,
    // Docs are large and identical on every call → cache them so each
    // suggestion only pays for (and waits on) the new transcript.
    system: [
      { type: 'text', text: INSTRUCTIONS },
      { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMsg }],
  });

  const encoder = new TextEncoder();
  const out = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n⚠ copilot error: ${(err as Error).message}`));
      } finally {
        controller.close();
      }
    },
    cancel() { stream.abort(); },
  });

  return new Response(out, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
