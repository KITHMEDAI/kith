// Content delivered immediately when someone opts in via LeadCaptureForm.
// Keyed by `source` — must match the frontmatter `leadMagnet` value on the
// blog post that offers it (see app/blog/[slug]/page.tsx).
export interface LeadMagnet {
  subject: string;
  /** Plain text — sendNotification's caller (lib/notify.ts) escapes this
   *  before rendering into HTML, so no markup here, just \n for breaks. */
  body: string;
}

export const LEAD_MAGNETS: Record<string, LeadMagnet> = {
  'guide-soap-templates': {
    subject: 'Your SOAP note template pack',
    body: `Here's the SOAP note template, ready to copy into whatever you use for notes.

SUBJECTIVE
- Presenting concerns this session:
- Reported mood/symptoms:
- Significant events since last session:
- Patient's stated goals for this session:

OBJECTIVE
- Affect/presentation:
- Engagement level:
- Notable behavioral observations:
- Standardized measure scores (if applicable):

ASSESSMENT
- Progress toward treatment goals:
- Clinical impressions:
- Changes since last session:
- Risk considerations (if any):

PLAN
- Homework/between-session tasks:
- Focus for next session:
- Changes to treatment approach:
- Referrals (if any):

The full guide — with a worked example and common mistakes to avoid — is here: https://kith.space/blog/soap-note-templates

— The Kith team`,
  },
};
