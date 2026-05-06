import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'kakmell-resources'

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
        '    3. Run `pnpm seed:events` again\n'
    )
    process.exit(1)
  }
}

initializeApp({ credential: getCredential(), projectId: PROJECT_ID })

const db = getFirestore()

const events = [
  {
    nama_majlis: 'Majlis Aisyah & Faez',
    hall_name: 'Elham Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-09')),
    sesi: 'siang',
    pax: 700,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Briyani', ayam: 'Ayam Masak Merah', daging: 'Daging Masak Hitam', acar: 'Pencuk', bubur: 'Bubur Kacang Hijau', air_panas: 'Teh O' },
    remarks: 'Berkat 100pax. Laksa johor 200pax, rojak petis 100pax, aiskrim 300pax (tuan rumah)',
    created_at: Timestamp.now(),
  },
  {
    nama_majlis: 'Majlis Alia & Irwan',
    hall_name: 'Asmara Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-10')),
    sesi: 'siang',
    pax: 500,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Briyani', ayam: 'Ayam Masak Merah', daging: 'Daging Kuzi', acar: 'Paceri Nenas', bubur: 'Bubur Pulut Hitam', air_panas: 'Teh O' },
    remarks: '',
    created_at: Timestamp.now(),
  },
  {
    nama_majlis: 'Majlis Insyirah & Izzuan',
    hall_name: 'Elham Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-10')),
    sesi: 'siang',
    pax: 700,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Minyak', ayam: 'Ayam Masak Merah', daging: 'Daging Briyani', acar: 'Paceri Nenas', bubur: 'Bubur Pulut Hitam', air_panas: 'Teh O' },
    remarks: 'Mee kawah 200pax, ice cream 250pax (add on). Soto 200pax (tuan rumah)',
    created_at: Timestamp.now(),
  },
  {
    nama_majlis: 'Majlis Amirul & Atikah',
    hall_name: 'Juwita Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-10')),
    sesi: 'siang',
    pax: 500,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Minyak', ayam: 'Ayam Masak Merah', daging: 'Daging Briyani', acar: 'Paceri Nenas', bubur: 'Bubur Kacang Hijau', air_panas: 'Teh O' },
    remarks: 'Berkat 50pax. Nasi putih lauk kampung, buah potong, ice cream (tuan rumah)',
    created_at: Timestamp.now(),
  },
  {
    nama_majlis: 'Majlis Irene & Shahrul',
    hall_name: 'Juwita Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-09')),
    sesi: 'malam',
    pax: 700,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Briyani', ayam: 'Ayam Masak Merah', daging: 'Daging Briyani', acar: 'Paceri Nenas', bubur: 'Bubur Kacang Hijau', air_panas: 'Teh O' },
    remarks: 'FULLY PAID. Koci dan apam gula hangus',
    created_at: Timestamp.now(),
  },
  {
    nama_majlis: 'Majlis Adriana & Irham',
    hall_name: 'Asmara Hall',
    tarikh: Timestamp.fromDate(new Date('2026-05-09')),
    sesi: 'siang',
    pax: 400,
    status: 'upcoming',
    menu_selection: { nasi: 'Nasi Briyani', ayam: 'Ayam Masak Merah', daging: 'Daging Briyani', acar: 'Paceri Nenas', bubur: 'Bubur Pulut Hitam', air_panas: 'Teh O' },
    remarks: '300+100pax. Nikah 8.30am. Laksa Johor 100pax, mee rebus 100pax, aiskrim 300pax (tuan rumah)',
    created_at: Timestamp.now(),
  },
]

async function seed() {
  const existing = await db.collection('events').limit(1).get()
  if (!existing.empty) {
    console.log('⚠  events collection already has data — skipping to avoid duplicates.')
    console.log('   Delete the events collection first if you want to re-seed.')
    return
  }

  const batch = db.batch()
  for (const event of events) {
    batch.set(db.collection('events').doc(), event)
  }
  await batch.commit()
  console.log(`✓ Seeded ${events.length} events`)
}

seed().catch((err: Error) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
