---
topic: >-
  most EHR breaches don't expose one therapist's caseload - they expose
  everyone's, because the data sits in one shared table with no isolation
  between accounts. Kith enforces row-level security so one therapist's
  compromised login can't read another therapist's patient data at the
  database layer, not just the app layer.
sourcePost: null
platforms:
  - twitter
image: content/social/assets/2026-08-23-og-card.png
status: pending
---

## Twitter/X

If one therapist's login gets compromised on a shared EHR, does it expose their caseload, or everyone's? Depends whether isolation is enforced in the app or the database. Kith uses row-level security at the database layer, so one account can't read another therapist's patient data even if the app layer is bypassed.
