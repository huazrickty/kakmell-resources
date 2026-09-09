// One-off migration: seed counters/invoice from the highest existing
// INV-YYYY-NNN per year, so the transactional numbering in
// src/lib/document-number.firestore.ts continues where the legacy
// count(all docs)+1 scheme left off.
//
// Usage:
//   pnpm seed:counters            dry-run (default): prints max per year, the
//                                 counter values that WOULD be written, and any
//                                 duplicate invoice_no found (legacy bug)
//   pnpm seed:counters --write    writes counters/invoice (merge — keeps other years)
//
// Order of operations on deploy:
//   1. deploy firestore.rules (adds the counters block)
//   2. run this script (dry-run, review, then --write)
//   3. deploy hosting. If the new client ships BEFORE the counter is seeded, the
//      first invoice becomes INV-YYYY-001 (counter starts at 0).
//
// Credentials: firebase-admin + service account (GOOGLE_APPLICATION_CREDENTIALS
// or ./firebase-service-account.json, which is gitignored). Never the client SDK.

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'kakmell-resources'
const RE = /^INV-(\d{4})-(\d+)$/
const write = process.argv.includes('--write')

function getCredential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? resolve(process.cwd(), 'firebase-service-account.json')
  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'))
    console.log(`Using service account: ${key.client_email}`)
    return cert(key)
  } catch {
    console.error(
      '\n  Service account key not found.\n' +
        `  Open https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk\n` +
        '  → "Generate new private key" → save as firebase-service-account.json in the project root (gitignored).\n',
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })
const db = getFirestore()

async function main() {
  const snap = await db.collection('invoices').get()

  const maxByYear: Record<string, number> = {}
  const idsByNo = new Map<string, string[]>()
  const unparsed: string[] = []

  for (const d of snap.docs) {
    const no = d.data().invoice_no as string | undefined
    const m = no ? RE.exec(no) : null
    if (!m) { unparsed.push(`${d.id} (invoice_no=${String(no)})`); continue }
    const [, year, seqStr] = m
    const seq = Number(seqStr)
    maxByYear[year] = Math.max(maxByYear[year] ?? 0, seq)
    idsByNo.set(no!, [...(idsByNo.get(no!) ?? []), d.id])
  }

  const dupes = [...idsByNo.entries()].filter(([, ids]) => ids.length > 1)

  console.log(`\ninvoices scanned : ${snap.size}`)
  console.log(`unparsed         : ${unparsed.length}`)
  for (const u of unparsed) console.log(`  skip ${u}`)

  console.log('\nhighest existing sequence per year:')
  for (const [year, max] of Object.entries(maxByYear).sort()) {
    console.log(`  ${year}: ${max}  → next number would be INV-${year}-${String(max + 1).padStart(3, '0')}`)
  }
  if (Object.keys(maxByYear).length === 0) console.log('  (none — counter will start from 001)')

  if (dupes.length) {
    console.warn('\nDUPLICATE invoice_no detected (legacy count+1 bug — resolve manually, numbers are NOT changed by this script):')
    for (const [no, ids] of dupes) console.warn(`  ${no} → ${ids.join(', ')}`)
  } else {
    console.log('\nno duplicate invoice_no found')
  }

  const ref = db.collection('counters').doc('invoice')
  const existing = await ref.get()
  if (existing.exists) console.log('\ncounters/invoice already exists:', existing.data())

  console.log('\ncounter values to write (counters/invoice, merge):', maxByYear)

  if (!write) {
    console.log('\nDRY RUN — nothing written. Re-run with --write to seed counters/invoice.')
    return
  }
  await ref.set(maxByYear, { merge: true })
  console.log('\nWRITTEN counters/invoice =', (await ref.get()).data())
}

main().catch((e) => { console.error(e); process.exit(1) })
