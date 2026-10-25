# Eval: Australian accent × noisy room (2026-10-25-12-57)

Australian neural voices (Natasha, William) reading NDIS / aged-care dialogues, at three noise levels, through the production Deepgram settings and note writer. Background noise is real meeting chatter (AMI, CC BY 4.0) plus traffic-style rumble for "loud".

Keyterms: field vocabulary + simulated per-user names & terms. Transcription only (no notes written or judged).

**Hard words kept: 79/102**

| Level | Avg word error rate | Avg speaker accuracy | Notes passed |
|---|---|---|---|
| clean | 4.3% | 100.0% | 0/4 |
| busy | 4.1% | 97.3% | 0/4 |
| loud | 4.4% | 98.1% | 0/4 |

| Dialogue | Level | WER | Hard words kept | Missed | Speakers found / accuracy | Judge (faith/cov/spk/stt) | Pass | Control (perfect transcript) |
|---|---|---|---|---|---|---|---|---|
| shift_summary | clean | 6.3% | 7/10 | arvo, toastie, 545 | 2 / 100% | — | — |  |
| shift_summary | busy | 4.9% | 7/10 | arvo, toastie, 545 | 2 / 98.1% | — | — |  |
| shift_summary | loud | 5.4% | 8/10 | toastie, 545 | 2 / 99.1% | — | — |  |
| home_visit | clean | 2.2% | 7/9 | weet-bix, kowalski | 2 / 100% | — | — |  |
| home_visit | busy | 2.2% | 7/9 | weet-bix, kowalski | 2 / 98.3% | — | — |  |
| home_visit | loud | 3.3% | 7/9 | weet-bix, kowalski | 2 / 97.1% | — | — |  |
| incident_report | clean | 4% | 5/7 | woolloongabba, non-slip | 2 / 100% | — | — |  |
| incident_report | busy | 4.5% | 5/7 | woolloongabba, non-slip | 2 / 96.3% | — | — |  |
| incident_report | loud | 4% | 5/7 | woolloongabba, non-slip | 2 / 97.9% | — | — |  |
| team_meeting | clean | 4.9% | 7/8 | arvo | 2 / 100% | — | — |  |
| team_meeting | busy | 4.9% | 7/8 | arvo | 2 / 96.6% | — | — |  |
| team_meeting | loud | 4.9% | 7/8 | arvo | 2 / 98.3% | — | — |  |

## Transcription errors and judge issues

**shift_summary [clean]**: arvo→avo, +right, righto→toe, +toe, +as, toastie→tie, +point, +five, dollars→zero, fifty→dollars, receipt's→receipts, mum→mom, +we, we're→are

**shift_summary [busy]**: arvo→avo, +tourist, toastie→tie, +point, +five, dollars→zero, fifty→dollars, receipt's→receipts, mum→mom, +we, we're→are

**shift_summary [loud]**: +how, toastie→tie, +point, +five, dollars→zero, fifty→dollars, receipt's→receipts, mum→mom, +we, we're→are, -knee, gel→nijel

**home_visit [clean]**: -ha, -weet, bix→weetbix, hallway's→hallways

**home_visit [busy]**: -ha, -weet, bix→weetbix, hallway's→hallways

**home_visit [loud]**: -ha, +seal, -weet, bix→weekdays, hallway's→hallways, -coordinator

**incident_report [clean]**: woolloongabba→woolongabba, centimetres→centimeters, graze→grays, -o'clock, dr→doctor, -non, slip→nonslip, too→two

**incident_report [busy]**: woolloongabba→woolongabba, centimetres→centimeters, graze→greys, helped→help, -o'clock, dr→doctor, -non, slip→nonslip, too→two

**incident_report [loud]**: woolloongabba→woolongabba, centimetres→centimeters, -he, -o'clock, dr→doctor, -non, slip→nonslip, too→two

**team_meeting [clean]**: arvo→avo, arvo→avo, supports→support's, dollars→point, fifty→five, cents→dollars, -first, of→july, july→one

**team_meeting [busy]**: arvo→avo, arvo→avo, supports→support's, dollars→point, fifty→five, cents→dollars, -first, of→july, july→one

**team_meeting [loud]**: arvo→avo, arvo→avo, -supports, dollars→point, fifty→five, cents→dollars, -first, of→july, july→one
