import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { halls, menuOptions } from './seed-data.js'

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
        '    3. Run `pnpm seed` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

async function seed() {
  // Check if already seeded to avoid duplicates
  const hallSnap = await db.collection('halls').limit(1).get()
  if (!hallSnap.empty) {
    console.log('⚠  halls collection already has data — skipping to avoid duplicates.')
    console.log('   Delete the halls and menu_options collections first if you want to re-seed.')
    return
  }

  const batch = db.batch()
  let count = 0

  for (const hall of halls) {
    batch.set(db.collection('halls').doc(), hall)
    count++
  }

  for (const option of menuOptions) {
    batch.set(db.collection('menu_options').doc(), option)
    count++
  }

  await batch.commit()
  console.log(
    `✓ Seeded ${count} documents (${halls.length} halls, ${menuOptions.length} menu options)`
  )
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
