---
topic: >-
  most EHR breaches don't expose one therapist's caseload - they expose
  everyone's, because the data sits in one shared table with no isolation
  between accounts. Kith enforces row-level security so one therapist's
  compromised login can't read another therapist's patient data at the database
  layer, not just the app layer.
sourcePost: null
platforms:
  - twitter
image: content/social/assets/2026-08-23-og-card.png
status: posted
posted_at: '2026-08-23T05:35:47.063Z'
tweet_url: 'https://x.com/i/web/status/2091398966919549058'
---

## Twitter/X

If one therapist's login gets compromised, does it expose their caseload, or everyone's? Depends whether isolation is enforced at the app layer or the database. Kith enforces row-level security at the database layer, so one compromised login can't read another therapist's data.
