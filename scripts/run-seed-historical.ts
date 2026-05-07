import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { historicalEvents } from './seed-historical.js'

const PROJECT_ID = 'kakmell-resources'
function getCredential() {
  const keyPath = resolve(process.cwd(), 'firebase-service-account.json')
  const key = JSON.parse(readFileSync(keyPath, 'utf8'))
  return cert(key)
}
initializeApp({ credential: getCredential(), projectId: PROJECT_ID })
const db = getFirestore()

async function seedHistorical() {
  const check = await db.collection('events').where('status','==','completed').limit(1).get()
  if (!check.empty) { console.log('Already seeded.'); return }
  console.log(`Seeding ${historicalEvents.length} events...`)
  let counter = 1, revenue = 0
  for (const event of historicalEvents) {
    const batch = db.batch()
    const eRef = db.collection('events').doc()
    batch.set(eRef, { nama_majlis: event.nama_majlis, hall_name: event.hall_name, tarikh: Timestamp.fromDate(event.tarikh), sesi: event.sesi, pax: event.pax, status: event.status, menu_selection: event.menu_selection, remarks: event.remarks||'', created_by: 'system-seed', created_at: Timestamp.fromDate(event.tarikh) })
    const year = event.tarikh.getFullYear()
    const invNo = `INV-${year}-${String(counter).padStart(3,'0')}`
    const iRef = db.collection('invoices').doc()
    const subtotal = event.invoice.line_items.reduce((s,i)=>s+(i.qty*i.unit_price),0)
    const total = subtotal - event.invoice.gaji_pekerja
    revenue += total
    batch.set(iRef, { event_id: eRef.id, invoice_no: invNo, invoice_date: Timestamp.fromDate(event.tarikh), billed_to: 'ZB GROUP SDN BHD', line_items: event.invoice.line_items.map((i,idx)=>({item_no:idx+1,description:i.description,qty:i.qty,unit_price:i.unit_price,tax:'-',total:i.qty*i.unit_price,is_deduction:false})), subtotal, gaji_pekerja: event.invoice.gaji_pekerja, total, status: 'paid', created_at: Timestamp.fromDate(event.tarikh) })
    await batch.commit()
    console.log(`✓ ${event.nama_majlis} — ${invNo} — RM ${total.toFixed(2)}`)
    counter++
  }
  console.log(`\n✅ ${historicalEvents.length} events seeded`)
  console.log(`💰 Total revenue: RM ${revenue.toLocaleString('en-MY',{minimumFractionDigits:2})}`)
}
seedHistorical().catch(console.error)
