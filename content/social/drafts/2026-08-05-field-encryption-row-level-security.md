---
topic: "\"encrypted\" in a privacy policy usually just means the connection - field-level encryption at rest and per-therapist row-level security are a different claim"
sourcePost: "dpdp-2023-therapist-notes"
platforms: ["twitter", "instagram"]
status: "pending"
---

## Twitter/X

"Encrypted" in a privacy policy usually just means the connection is HTTPS - it says nothing about the database at rest. Kith encrypts patient fields at rest and enforces row-level security, so one therapist's login can't query another's records.

## Instagram

"Encrypted" is doing a lot of work in most software privacy policies. Most of the time it means the connection between your browser and the server is encrypted - HTTPS - which is good, but says nothing about what happens to the data once it's sitting in a database.

India's DPDP Act requires "reasonable security safeguards" without spelling out a checklist, but encryption at rest and real access controls are the baseline anyone points to.

Kith encrypts patient fields at rest, not just the connection, and enforces row-level security - each therapist's login can only ever query their own patients' records, at the database level, not just hidden in the app's UI.

It's not a feature you'd show a patient. It's one you should be able to answer for, honestly, if they ever ask.
