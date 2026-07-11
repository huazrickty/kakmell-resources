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
        '    3. Run `pnpm migrate:menutypes` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

// Adds menu_type: 'kahwin' to every menu_options doc that has no menu_type yet.
// Idempotent — docs that already have a menu_type are left untouched.
async function migrate() {
  const snap = await db.collection('menu_options').get()
  const missing = snap.docs.filter((d) => d.data().menu_type === undefined)

  if (missing.length === 0) {
    console.log(`✓ Nothing to migrate — all ${snap.size} menu_options docs already have menu_type.`)
    return
  }

  for (let i = 0; i < missing.length; i += 500) {
    const batch = db.batch()
    missing.slice(i, i + 500).forEach((d) => batch.update(d.ref, { menu_type: 'kahwin' }))
    await batch.commit()
  }

  console.log(`✓ Migrated ${missing.length} of ${snap.size} menu_options docs to menu_type: 'kahwin'`)
}

migrate().catch((err: Error) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
