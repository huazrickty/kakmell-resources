import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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
        '    3. Run `pnpm seed:tasks` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

const TASK_NAMES = [
  'kemas tempat bawang/kentang',
  'masukkan basikal/scooter',
  'basuh periuk kukus nasi 1/2',
  'basuh periuk kukus nasi 2/2',
  'check rack depan',
  'check kotak kosong',
  'mop lantai depan',
  'sapu lantai depan',
  'amek periuk',
  'lap mesin blender',
  'susun semua rack',
  'kemas peti sejuk depan',
  'lap tempat garam',
  'check peti beku 1/3',
  'check peti beku 2/3',
  'topup ajinamoto',
  'topup garam',
  'lap dinding sambal',
  'basuh kuali',
  'susuh kuali',
  'check peti beku 3/3',
  'masukkan meja',
  'masukkan sinki',
  'susun periuk',
  'basuh tandas 1/2',
  'check tong sampah belakang',
  'check tong sampah depan',
  'masukkan tong minyak',
  'lipat canopi',
  'basuh tandas 2/2',
  'basuh sinki',
  'lap semua meja',
  'sapu lantai belakang',
  'masukkan dapur hitam',
  'susun gas',
  'basuh lantai belakang',
]

async function seedTasks() {
  const snap = await db.collection('tasks').get()
  const existing = new Set(snap.docs.map((d) => d.data().name as string))

  const batch = db.batch()
  let inserted = 0
  let skipped = 0

  TASK_NAMES.forEach((name, i) => {
    if (existing.has(name)) {
      skipped++
      return
    }
    batch.set(db.collection('tasks').doc(), {
      name,
      is_active: true,
      order: i + 1,
      created_at: FieldValue.serverTimestamp(),
    })
    inserted++
  })

  if (inserted > 0) await batch.commit()
  console.log(`✓ Tasks seeded: ${inserted} inserted, ${skipped} skipped (already exist)`)
}

seedTasks().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
