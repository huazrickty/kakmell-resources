import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const key = JSON.parse(readFileSync(resolve(process.cwd(), 'firebase-service-account.json'), 'utf8'))
initializeApp({ credential: cert(key) })
const db = getFirestore()

const CORRECTIONS: Array<{ nama_majlis: string; updates: Record<string, string> }> = [
  {
    nama_majlis: 'Majlis Aisyah & Faez',
    updates: {
      'menu_selection.acar':  'Pencuk',
      'menu_selection.bubur': 'Bubur Kacang Hijau',
    },
  },
  {
    nama_majlis: 'Majlis Adriana & Irham',
    updates: {
      'menu_selection.acar':  'Paceri Nenas',
      'menu_selection.bubur': 'Bubur Pulut Hitam',
    },
  },
  {
    nama_majlis: 'Majlis Irene & Shahrul',
    updates: {
      'menu_selection.acar':      'Paceri Nenas',
      'menu_selection.bubur':     'Bubur Kacang Hijau',
      'menu_selection.air_panas': 'Air Sirap',
    },
  },
  {
    nama_majlis: 'Majlis Amirul & Atikah',
    updates: {
      'menu_selection.acar':  'Paceri Nenas',
      'menu_selection.bubur': 'Bubur Kacang Hijau',
    },
  },
  {
    nama_majlis: 'Majlis Alia & Irwan',
    updates: {
      'menu_selection.acar':   'Paceri Nenas',
      'menu_selection.bubur':  'Bubur Pulut Hitam',
      'menu_selection.daging': 'Daging Kuzi',
    },
  },
  {
    nama_majlis: 'Majlis Insyirah & Izzuan',
    updates: {
      'menu_selection.acar':   'Paceri Nenas',
      'menu_selection.bubur':  'Bubur Pulut Hitam',
      'menu_selection.daging': 'Daging Briyani',
    },
  },
]

async function main() {
  for (const { nama_majlis, updates } of CORRECTIONS) {
    const snap = await db.collection('events')
      .where('nama_majlis', '==', nama_majlis)
      .get()

    if (snap.empty) {
      console.warn(`✗ Not found: "${nama_majlis}"`)
      continue
    }

    if (snap.size > 1) {
      console.warn(`  Warning: ${snap.size} docs match "${nama_majlis}" — updating all.`)
    }

    for (const docSnap of snap.docs) {
      await docSnap.ref.update(updates)
    }

    console.log(`✓ Fixed: ${nama_majlis}`)
  }

  console.log('\nDone.')
}

main().catch((err) => { console.error(err); process.exit(1) })
