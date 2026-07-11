import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function logActivity(params: {
  action: string
  category: 'event' | 'invoice' | 'user' | 'ingredient' | 'settings' | 'task' | 'menu'
  description: string
  entity_id?: string
  entity_name?: string
  performed_by: string
  performed_by_name: string
}): Promise<void> {
  try {
    await addDoc(collection(db, 'activity_log'), {
      ...params,
      timestamp: serverTimestamp(),
    })
  } catch {
    // silent fail — never blocks the UI
  }
}
