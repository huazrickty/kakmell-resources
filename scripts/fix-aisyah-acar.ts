import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const keyPath = resolve(process.cwd(), 'firebase-service-account.json')
const key = JSON.parse(readFileSync(keyPath, 'utf8'))

initializeApp({ credential: cert(key) })
const db = getFirestore()

async function main() {
  const snap = await db.collection('events')
    .where('nama_majlis', '==', 'Majlis Aisyah & Faez')
    .get()

  if (snap.empty) {
    console.error('No event found with nama_majlis = "Majlis Aisyah & Faez"')
    process.exit(1)
  }

  if (snap.size > 1) {
    console.warn(`Found ${snap.size} matching documents — updating all.`)
  }

  for (const docSnap of snap.docs) {
    const before = (docSnap.data().menu_selection as Record<string, string>)?.acar
    await docSnap.ref.update({ 'menu_selection.acar': 'Pencuk' })
    console.log(`Updated ${docSnap.id}: menu_selection.acar "${before}" → "Pencuk"`)
  }

  console.log('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
