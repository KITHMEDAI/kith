---
topic: >-
  booking a 12-week recurring series is where double-booking actually sneaks
  in - nobody checks week 9 by hand. Kith conflict-checks every occurrence
  in a recurring series against existing appointments before booking, books
  the clear weeks, and names the ones that clash instead of silently
  double-booking them or refusing the whole series (verified in
  app/api/appointments/route.ts - per-occurrence overlap check, clashes
  returned as `skipped` with the conflicting appointment, fail-closed if the
  availability check itself errors). New angle vs. 2026-08-14 (single-booking
  conflict check) and 2026-09-12 (cancelling one occurrence).
sourcePost: null
platforms:
  - twitter
status: pending
---

## Twitter/X

Double-booking rarely happens on the first session. It happens in week 9 of a recurring series nobody checked by hand.

Kith checks every date in a recurring booking against your existing appointments, books the clear ones, and tells you exactly which weeks clash.
