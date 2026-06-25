import type { VoiceCommand } from '@/types';

const COMMAND_PATTERNS: { intent: VoiceCommand['intent']; patterns: RegExp[] }[] = [
  {
    intent: 'start_session',
    patterns: [/start\s+(session|recording)/i, /begin\s+(session|recording)/i],
  },
  {
    intent: 'end_session',
    patterns: [/end\s+(session|recording)/i, /stop\s+(session|recording)/i, /finish\s+session/i],
  },
  {
    intent: 'add_note',
    patterns: [/add\s+note\s+(.+)/i, /note\s+that\s+(.+)/i, /write\s+down\s+(.+)/i],
  },
  {
    intent: 'flag_risk',
    patterns: [/flag\s+(risk|concern)/i, /mark\s+as\s+(high\s+)?risk/i, /risk\s+alert/i],
  },
  {
    intent: 'navigate',
    patterns: [
      /go\s+to\s+(dashboard|patients|appointments|notes|settings|insights)/i,
      /open\s+(dashboard|patients|appointments|notes|settings|insights)/i,
      /show\s+(dashboard|patients|appointments|notes|settings|insights)/i,
    ],
  },
  {
    intent: 'search_patient',
    patterns: [/search\s+(for\s+)?patient\s+(.+)/i, /find\s+patient\s+(.+)/i],
  },
  {
    intent: 'book_appointment',
    patterns: [/book\s+(an?\s+)?appointment/i, /schedule\s+(an?\s+)?appointment/i, /new\s+appointment/i],
  },
];

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const trimmed = transcript.trim();
  if (!trimmed) return null;

  for (const { intent, patterns } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const params: Record<string, string> = {};

        if (intent === 'navigate' && match[1]) {
          params.destination = match[1].toLowerCase();
        }
        if (intent === 'search_patient' && (match[2] || match[1])) {
          params.query = (match[2] || match[1]).trim();
        }
        if (intent === 'add_note' && match[1]) {
          params.text = match[1].trim();
        }

        return { intent, transcript: trimmed, params, confidence: 0.9 };
      }
    }
  }

  return { intent: 'unknown', transcript: trimmed, params: {}, confidence: 0.3 };
}

export function getNavigationPath(destination: string): string {
  const routes: Record<string, string> = {
    dashboard: '/dashboard',
    patients: '/patients',
    appointments: '/appointments',
    notes: '/notes',
    settings: '/settings',
    insights: '/insights',
  };
  return routes[destination] || '/dashboard';
}
