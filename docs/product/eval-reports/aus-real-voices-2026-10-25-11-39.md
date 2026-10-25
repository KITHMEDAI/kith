# Eval: real Australian voices × noisy room (2026-10-25-11-39)

Real LibriVox volunteers (public domain) reading Aesop's "The North Wind and the Sun" in their own accent, transcribed with the production Deepgram settings. Word error rate is measured on the passage only (intro cut). The baselines (English RP, New Zealand) show how much of the error is the accent vs small wording differences in the text read.

| Level | Australian speakers (avg WER) | Baselines (avg WER) |
|---|---|---|
| clean | 5.3% | 0.0% |
| busy | 1.6% | 0.5% |
| loud | 4.9% | 53.1% |

| Reader | Level | WER | First errors |
|---|---|---|---|
| Australian (Annise) | clean | 3.5% | cloak→coke, cloak→coke, cloak→croak, around→about |
| Australian (Annise) | busy | 3.5% | cloak→coat, cloak→coke, cloak→coke, around→about |
| Australian (Annise) | loud | 5.3% | cloak→coat, cloak→coat, cloak→croak, around→about, -north, wind→northwind |
| BASELINE English RP (Ruth Golding) | clean | 0.0% | — |
| BASELINE English RP (Ruth Golding) | busy | 0.0% | — |
| BASELINE English RP (Ruth Golding) | loud | 11.5% | -as, -he, -could, -confess, -that, -the, -sun, -was |
| BASELINE New Zealand | clean | 0.0% | — |
| BASELINE New Zealand | busy | 0.9% | could→put |
| BASELINE New Zealand | loud | 94.7% | -the, -north, -wind, -and, -the, -sun, -were, -disputing |
| Australian (Graeme Dunlop) | clean | 24.8% | +dialect, +and, +accent, +collection, +volume, +one, +and, +the |
| Australian (Graeme Dunlop) | busy | 2.7% | -north, wind→northwind, -did |
| Australian (Graeme Dunlop) | loud | 6.2% | a→the, -but, closely→close, did→now, fold→pulled, -the, -that |
| Australian, cultivated (Timothy Ferguson) | clean | 0.0% | — |
| Australian, cultivated (Timothy Ferguson) | busy | 0.0% | — |
| Australian, cultivated (Timothy Ferguson) | loud | 3.5% | -the, fold→hold, -the, attempt→intent |
| Australian (Magdalena) | clean | 0.0% | — |
| Australian (Magdalena) | busy | 0.0% | — |
| Australian (Magdalena) | loud | 0.9% | -then |
| Australian, metropolitan | clean | 3.5% | +off, -off, out→warmly, warmly→out |
| Australian, metropolitan | busy | 3.5% | +off, -off, out→warmly, warmly→out |
| Australian, metropolitan | loud | 7.1% | +off, -off, -north, -north, +along, out→the, warmly→app, cloak→clothes |
| Australian | clean | 0.0% | — |
| Australian | busy | 0.0% | — |
| Australian | loud | 6.2% | -the, cloak→coat, could→did, but→and, fold→hold, -obliged, of→than |