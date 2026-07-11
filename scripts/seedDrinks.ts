import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'kakmell-resources'

// Resolve service account: GOOGLE_APPLICATION_CREDENTIALS env var, or
// a firebase-service-account.json file in the project root.
function getCredential() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const defaultPath = resolve(process.cwd(), 'firebase-service-account.json')
  const keyPath = envPath ?? defaultPath

  try {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'))
    console.log(`Using service account: ${key.client_email}`)
    return cert(key)
  } catch {
    console.error(
      '\n  Service account key not found.\n' +
        '  Steps to get one:\n' +
        '    1. Open https://console.firebase.google.com/project/' +
        PROJECT_ID +
        '/settings/serviceaccounts/adminsdk\n' +
        '    2. Click "Generate new private key" → save as firebase-service-account.json\n' +
        '       in the project root (it is already .gitignored)\n' +
        '    3. Run `pnpm seed:drinks` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

const HOT  = ['Teh O', 'Kopi O', 'Air Sirap']
const COLD = ['Air Anggur/Kordial', 'Air Sirap']

// Legacy 'air' items known to be cold; everything else in 'air' becomes hot
const COLD_LEGACY = new Set(['Air Anggur', 'Air Kordial', 'Air Anggur/Kordial'])

async function seedDrinks() {
  const snap = await db.collection('menu_options').get()
  const kahwinDocs = snap.docs.filter((d) => (d.data().menu_type ?? 'kahwin') === 'kahwin')

  const batch = db.batch()
  let migrated = 0
  let inserted = 0
  let skipped = 0

  // 1) Migrate legacy category 'air' → 'air_panas' / 'air_sejuk'
  for (const d of kahwinDocs) {
    const data = d.data()
    if (data.category !== 'air') continue
    const category = COLD_LEGACY.has(data.name_ms) ? 'air_sejuk' : 'air_panas'
    batch.update(d.ref, { category, menu_type: 'kahwin' })
    migrated++
  }

  // 2) Seed defaults, deduped by (category, name) — including docs migrated above
  const existing = new Set(
    kahwinDocs.map((d) => {
      const data = d.data()
      const category = data.category === 'air'
        ? (COLD_LEGACY.has(data.name_ms) ? 'air_sejuk' : 'air_panas')
        : data.category
      return `${category}::${data.name_ms}`
    })
  )

  // Skip the combined cold default if the separate legacy items already cover it
  const hasSeparateCold = existing.has('air_sejuk::Air Anggur') || existing.has('air_sejuk::Air Kordial')

  const wanted: Array<{ category: string; name_ms: string }> = [
    ...HOT.map((name_ms) => ({ category: 'air_panas', name_ms })),
    ...COLD.map((name_ms) => ({ category: 'air_sejuk', name_ms })),
  ]

  for (const { category, name_ms } of wanted) {
    if (existing.has(`${category}::${name_ms}`)) { skipped++; continue }
    if (category === 'air_sejuk' && name_ms === 'Air Anggur/Kordial' && hasSeparateCold) { skipped++; continue }
    batch.set(db.collection('menu_options').doc(), {
      menu_type: 'kahwin',
      category,
      name_ms,
      is_active: true,
    })
    inserted++
  }

  if (migrated > 0 || inserted > 0) await batch.commit()
  console.log(`✓ Drinks: ${migrated} legacy 'air' docs re-categorised, ${inserted} inserted, ${skipped} skipped`)
}

seedDrinks().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
