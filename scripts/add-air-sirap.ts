import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const key = JSON.parse(readFileSync(resolve(process.cwd(), 'firebase-service-account.json'), 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()

async function main() {
  const existing = await db.collection('menu_options')
    .where('category', '==', 'air')
    .where('name_ms', '==', 'Air Sirap')
    .get()

  if (!existing.empty) {
    console.log('Air Sirap already exists in menu_options — skipping.')
    return
  }

  const ref = await db.collection('menu_options').add({
    category: 'air',
    name_ms: 'Air Sirap',
    is_active: true,
  })

  console.log(`✓ Added Air Sirap (${ref.id})`)
}

main().catch((err) => { console.error(err); process.exit(1) })
