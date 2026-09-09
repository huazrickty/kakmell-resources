// Sequence gaps are expected and intentional. A burned number (failed addDoc,
// or a retried transaction that had already committed) is never reused —
// reissuing numbers is the exact bug this module replaces. Do not add
// gap-filling logic.
import { doc, runTransaction } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatDocumentNumber, nextSequence, type CounterDoc, type DocumentKind } from './document-number'

/**
 * Atomically increments counters/{kind}.{year} and returns the formatted number.
 * Fixes: race between two admins, and re-issue of a number after a delete.
 *
 * `year` MUST be the year of the document date (e.g. invoiceDate.getFullYear()),
 * never the system clock — a backdated document keeps its own year's sequence.
 *
 * Retry: Firestore's runTransaction already retries on contention (default 5
 * attempts) — that covers two admins saving at once. We add ONE outer retry
 * only for the 'aborted' / 'unavailable' error codes (transient network),
 * so a flaky mobile connection does not surface as a failed save. Any other
 * error (e.g. permission-denied when rules are not deployed) is thrown as-is.
 */
export async function nextDocumentNumber(kind: DocumentKind, year: number): Promise<string> {
  const ref = doc(db, 'counters', kind)
  const key = String(year)

  const run = () =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      const next = nextSequence(snap.exists() ? (snap.data() as CounterDoc) : undefined, year)
      tx.set(ref, { [key]: next }, { merge: true })
      return next
    })

  let seq: number
  try {
    seq = await run()
  } catch (err) {
    const code = (err as { code?: string } | null)?.code
    if (code === 'aborted' || code === 'unavailable') seq = await run()
    else throw err
  }
  return formatDocumentNumber(kind, year, seq)
}
