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
        '    3. Run `pnpm seed:menutypes` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

const ITEMS: Record<string, string[]> = {
  ala_kampung: [
    'Nasi putih',
    'Ayam goreng berempah',
    'Asam pedas ikan kaci',
    'Sambal goreng jawa',
    'Masak lemak labu',
    'Sambal belacan dan ulam-ulaman',
    'Ikan masin dan telur masin',
    'Kuih 2 jenis',
    'Air kordial',
    'Teh O',
    'Bubur',
    'Buah',
  ],
  western: [
    'Spaghetti',
    'Carbonara & Bolognese',
    'Meat ball',
    'Chicken chop',
    'Sos black pepper',
    'Coleslaw',
    'French fries',
    'Nugget',
    'Mushroom soup',
    'Air kordial',
    'Teh O',
    'Buah',
  ],
  raya: [
    'Ketupat',
    'Sayur lodeh',
    'Rendang Daging',
    'Ayam masak merah',
    'Sambal kacang',
    'Sambal goreng jawa',
    'Air kordial',
    'Teh O',
    'Bubur',
    'Buah',
  ],
}

async function seedMenuTypeItems() {
  const snap = await db.collection('menu_options').get()
  const existing = new Set(
    snap.docs.map((d) => {
      const data = d.data()
      return `${data.menu_type ?? 'kahwin'}::${data.name_ms}`
    })
  )

  const batch = db.batch()
  let inserted = 0
  let skipped = 0

  for (const [menu_type, names] of Object.entries(ITEMS)) {
    for (const name_ms of names) {
      if (existing.has(`${menu_type}::${name_ms}`)) {
        skipped++
        continue
      }
      batch.set(db.collection('menu_options').doc(), {
        menu_type,
        category: 'item',
        name_ms,
        is_active: true,
      })
      inserted++
    }
  }

  if (inserted > 0) await batch.commit()
  console.log(`✓ Menu type items seeded: ${inserted} inserted, ${skipped} skipped (already exist)`)
}

seedMenuTypeItems().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
