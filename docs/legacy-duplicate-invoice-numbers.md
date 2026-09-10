# Legacy duplicate invoice numbers

Snapshot taken 2026-09-09 from production `invoices` (267 documents).

These invoice numbers are shared by more than one document. Cause: the retired
numbering scheme (`count(all invoices) + 1`) re-issued a number whenever an invoice
had been deleted, or when two admins saved at the same time. Since 2026-09-09 numbers
come from a transactional per-year counter (`counters/invoice`), so no new duplicates
can occur.

**Nothing here was changed or renumbered.** These invoices may already have been sent
to ZB Group; changing their numbers would break the paper trail. This list exists so
the affected invoices can be checked manually against what was actually sent.

Groups: 10 · documents involved: 23

| invoice_no | doc ID | invoice date | event / reference | total | status |
|---|---|---|---|---|---|
| INV-2026-161 | `tkVWb4tjc4paK3LtvPn1` | 07/05/2026 | event `tWODzqYnAlZI5ulIMN7x` | RM 6,330.00 | paid |
| INV-2026-161 | `9PsRpmDMdNjXPtfyTA7x` | 13/05/2026 | event `YdUwrHRZH0iNEt6oOTT1` | RM 3,140.00 | paid |
| INV-2026-176 | `6vjm3BPERc4bJhb7jXp0` | 21/05/2026 | event `cG8ydVKebjlmWeN0qHLo` | RM 9,750.00 | paid |
| INV-2026-176 | `c07wgCgtfv96gkidPL9M` | 21/05/2026 | event `Zm9xbTPVTzhSTow2jNYJ` | RM 7,555.00 | paid |
| INV-2026-176 | `BcfOWRn1JmmyMYG9uOYP` | 21/05/2026 | event `nXjm9xcvIV94yMRZIBJG` | RM 10,100.00 | paid |
| INV-2026-178 | `OLgONlrQsHw84CNSkfyL` | 21/05/2026 | event `zZB6mpyb3GxSHGBTyD9u` | RM 3,710.00 | paid |
| INV-2026-178 | `Olg6OznoKeDXkc3MCxXU` | 28/05/2026 | event `76EKlzSaZeqUncI3cig6` | RM 6,930.00 | paid |
| INV-2026-184 | `qAIIBHsUgaiyJBKh4Zhp` | 29/05/2026 | event `RovtZGbG4KNGPk9nRQ9D` | RM 5,590.00 | paid |
| INV-2026-184 | `80kXKo2gNBY5l1hDd7Xe` | 29/05/2026 | event `FTV9gibT2KPNxFi0M6ZD` | RM 5,590.00 | paid |
| INV-2026-196 | `S4bzPyl43HH0d2u0ErDA` | 11/06/2026 | event `BIhUmwnFoWdQUoaahJy0` | RM 6,680.00 | paid |
| INV-2026-196 | `ofTHjYaX7bmHsD7ki0QI` | 12/06/2026 | event `u463rwWI5LvnHBz0lA0q` | RM 4,135.00 | paid |
| INV-2026-202 | `qhr5u1mylO4wVXbvBjjx` | 16/06/2026 | event `Ne4wUBhKkyLyHglAtVM4` | RM 4,600.00 | paid |
| INV-2026-202 | `pSP6X7MeqYQWIsgWHPlo` | 16/06/2026 | event `8ROQT0rBzEYwkAJWBmlT` | RM 7,730.00 | paid |
| INV-2026-202 | `NXKfjVOzTnogggUiRo3A` | 17/06/2026 | event `ZM9STwXNJ8B2YFMwAxK3` | RM 8,560.00 | paid |
| INV-2026-207 | `aBFSkBQKvMbNC4TbWNr3` | 25/06/2026 | event `0bz5pBsJMTdTw6LxhMMc` | RM 1,400.00 | draft |
| INV-2026-207 | `6UP5G9HmqSs2LUFlzvRL` | 26/06/2026 | event `VoPHTh8uS0HgllkeDrUG` | RM 10,490.00 | draft |
| INV-2026-207 | `xNqI5jsQmINSmKIXvEgR` | 26/06/2026 | event `mmGmwiksR7t2qhwkrocu` | RM 2,720.00 | draft |
| INV-2026-214 | `IeD2xQUVvQlnPFvNBEyf` | 02/07/2026 | event `zx2kzeFadpjT91tD6iD0` | RM 9,750.00 | paid |
| INV-2026-214 | `Gkzcl4iHIKCJwGiG1Bo3` | 03/07/2026 | event `Vg4OPl9kqf0jghFyOsiY` | RM 5,940.00 | paid |
| INV-2026-246 | `8sBQlbCz2wzryoVSxUiH` | 20/08/2026 | event `hZBLPoUrX547Ku1HnnQ9` | RM 9,750.00 | draft |
| INV-2026-246 | `MFjs1sfIsCiaKP1T3oj7` | 20/08/2026 | event `q1gtxw1zF3sYhhTWfjEu` | RM 5,590.00 | draft |
| INV-2026-255 | `0QBirWLhrw0ZKeMAHjOB` | 27/08/2026 | event `4epIgDoqm9q9xqGw9TqK` | RM 300.00 | draft |
| INV-2026-255 | `WUtPZVHJVgr4A2AXefsk` | 28/08/2026 | event `DKF1i6EeOdDpmK6Blu6E` | RM 5,590.00 | draft |

Open a document in the app at `/invoices/<doc ID>`.

---

## 2026-09-11 — Invoices issued by a stale client after the counter rollout

Phase 1 (transactional numbering via `counters/invoice`) was deployed to hosting on
2026-09-09 ~20:44 MYT with `counters/invoice.2026 = 267` (the highest number then).
Four real invoices were created on **2026-09-10 15:07–15:09 MYT** with the numbers below,
although the counter had already advanced to 272 by then:

| invoice_no | doc ID | created (UTC) | event | total | status |
|---|---|---|---|---|---|
| INV-2026-268 | `akB25VmcyBoFXzLhBrak` | 2026-09-10 07:07 | `rJU1moxn8FySknchak7j` | RM 500.00 | draft |
| INV-2026-269 | `Ste3rqsVK68Y6gGl7zDQ` | 2026-09-10 07:08 | `K0PsBJ3ArgmTQg8BiakE` | RM 6,680.00 | draft |
| INV-2026-270 | `jGMT6jzIUhPiZXVXp6Af` | 2026-09-10 07:08 | `KPlHqVttwyeTZwz8olQH` | RM 4,600.00 | draft |
| INV-2026-271 | `zC3dvxCwbRf6iRnqcs4U` | 2026-09-10 07:09 | `9bu6mkXRpfJyJzEblKOp` | RM 6,680.00 | draft |

**Cause.** The numbers follow the retired `count(all invoices) + 1` scheme (267 docs + 1 = 268 …),
i.e. they were issued by the **previous app bundle** still running on the admin's device.
The PWA service worker (`registerType: 'autoUpdate'`, `skipWaiting`, `clientsClaim`) only
swaps bundles after the app/tab is fully closed and reopened; an app left open keeps the old code.

**Data.** Nothing was changed. 268–271 are valid and unique.

**Risk.** As long as the stale bundle is in use it keeps issuing `count + 1`
(next would have been 272) while the new bundle issues `counter + 1`. With the counter at 275
the two sequences would have collided after only four more invoices.

**Mitigation applied (2026-09-11).** `counters/invoice.2026` raised from **275 → 300** in a
Firestore transaction (`max(current, 300)`, never lowered). Next number from the new bundle:
**INV-2026-301**. The stale bundle would need 29 more invoices to reach it.
`pnpm seed:counters` keeps the same guard and reports `(counter ahead — kept)`.

**To close the gap for good** (follow-up, not done): the app should detect a waiting service
worker and prompt "versi baru tersedia — muat semula" (vite-plugin-pwa `registerType: 'prompt'`
+ `useRegisterSW`); and the admin device must fully close and reopen the app after each deploy.
