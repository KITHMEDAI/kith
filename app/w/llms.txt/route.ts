import { USE_CASES } from '@/lib/workspace/use-cases';
import { GUIDES } from '@/lib/workspace/guides';
import { WS_URL, WS_NAME, WS_DESCRIPTION, HOME_FAQ } from '@/lib/workspace/site';

// /llms.txt: a plain-text summary for AI assistants and answer engines
// (served at work.kith.space/llms.txt via the workspace rewrite).
export const dynamic = 'force-static';

export function GET() {
  const lines = [
    `# ${WS_NAME}`,
    '',
    `> ${WS_DESCRIPTION}`,
    '',
    'Kith Workspace is a web app (no install) for people whose work happens away from a desk. You speak for a minute or two, record a meeting (in the room, or Teams / Meet / Zoom in the browser), or paste rough notes, and it writes a structured note in your industry\'s format. It writes only what was said, marks missing details as "Not stated", and you check and edit every note. Notes are stored in Sydney, Australia and encrypted; recordings are deleted after transcription; AI processing runs in the US with model training off. Free during early access.',
    '',
    '## Use cases',
    '',
    ...USE_CASES.map(u => `- [${u.name}](${WS_URL}/for/${u.slug}): ${u.seoDescription}`),
    '',
    '## Guides',
    '',
    ...GUIDES.map(g => `- [${g.title}](${WS_URL}/guides/${g.slug}): ${g.seoDescription}`),
    '',
    '## FAQ',
    '',
    ...HOME_FAQ.flatMap(f => [`### ${f.q}`, f.a, '']),
    '## Links',
    '',
    `- [Start free](${WS_URL}/login?mode=signup)`,
    `- [Privacy](${WS_URL}/privacy)`,
    `- [Terms](${WS_URL}/terms)`,
    `- [Help](${WS_URL}/help)`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
