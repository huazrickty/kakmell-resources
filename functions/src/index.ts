import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { calculateIngredients } from "./ingredient-calculator.js";

setGlobalOptions({ maxInstances: 10 });
initializeApp();

const db = getFirestore();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApproveUserData {
  uid: string;
  role: "admin" | "kitchen";
}

interface ChangeUserRoleData {
  uid: string;
  newRole: string;
  devPassword: string;
}

interface WeeklyExportData {
  weekStart: string; // ISO date string, Monday e.g. "2026-05-04"
}

interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
  is_deduction: boolean;
}

interface CreateInvoiceData {
  event_id: string;
  line_items: LineItem[];
  gaji_pekerja: number;
}

interface UpdateInvoiceStatusData {
  invoice_id: string;
  status: "draft" | "sent" | "paid";
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function assertAdmin(uid: string): Promise<void> {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists || doc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

// ── approveUser ───────────────────────────────────────────────────────────────

export const approveUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  const { uid, role } = request.data as ApproveUserData;

  await db.collection("users").doc(uid).update({
    role,
    approved_at: FieldValue.serverTimestamp(),
    approved_by: request.auth.uid,
  });

  return { success: true };
});

// ── changeUserRole ────────────────────────────────────────────────────────────

export const changeUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { uid, newRole, devPassword } = request.data as ChangeUserRoleData;
  const DEV_PASSWORD = process.env.DEV_PASSWORD ?? "881188";

  if (devPassword !== DEV_PASSWORD) {
    throw new HttpsError("permission-denied", "Invalid developer password.");
  }

  await db.collection("users").doc(uid).update({ role: newRole });

  return { success: true };
});

// ── generateWeeklyExportData ──────────────────────────────────────────────────

export const generateWeeklyExportData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  const { weekStart } = request.data as WeeklyExportData;

  // Parse as MYT (UTC+8) to match how dates are stored from the Malaysian UI
  const weekStartDate = new Date(weekStart + "T00:00:00+08:00");
  const weekEndDate = new Date(weekStart + "T00:00:00+08:00");
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const eventsSnap = await db.collection("events")
    .where("tarikh", ">=", Timestamp.fromDate(weekStartDate))
    .where("tarikh", "<=", Timestamp.fromDate(weekEndDate))
    .orderBy("tarikh")
    .get();

  const results = eventsSnap.docs.map((doc) => {
    const event = doc.data();
    return {
      event: {
        nama_majlis: event.nama_majlis as string,
        hall_name: event.hall_name as string,
        tarikh: event.tarikh as Timestamp,
        sesi: event.sesi as string,
        pax: event.pax as number,
        menu_selection: event.menu_selection as Record<string, string>,
      },
      ingredients: calculateIngredients(event.pax as number),
    };
  });

  return results;
});

// ── createInvoice ─────────────────────────────────────────────────────────────

export const createInvoice = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  const { event_id, line_items, gaji_pekerja } = request.data as CreateInvoiceData;

  // Auto-generate invoice number: count all invoices + 1, formatted INV-YYYY-NNN
  const year = new Date().getFullYear();
  const allSnap = await db.collection("invoices").get();
  const seq = allSnap.size + 1;
  const invoice_no = `INV-${year}-${String(seq).padStart(3, "0")}`;

  // Recalculate totals server-side — never trust client-supplied totals
  const processedItems = line_items.map((item) => ({
    description: item.description,
    qty: item.qty,
    unit_price: item.unit_price,
    is_deduction: item.is_deduction,
    total: item.qty * item.unit_price,
  }));

  const subtotal = processedItems
    .filter((item) => !item.is_deduction)
    .reduce((sum, item) => sum + item.total, 0);

  const total = subtotal - gaji_pekerja;

  const invoiceRef = db.collection("invoices").doc();
  await invoiceRef.set({
    event_id,
    invoice_no,
    invoice_date: FieldValue.serverTimestamp(),
    billed_to: "ZB GROUP SDN BHD",
    line_items: processedItems,
    subtotal,
    gaji_pekerja,
    total,
    status: "draft",
    created_at: FieldValue.serverTimestamp(),
  });

  return { success: true, invoice_id: invoiceRef.id, invoice_no };
});

// ── updateInvoiceStatus ───────────────────────────────────────────────────────

export const updateInvoiceStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  await assertAdmin(request.auth.uid);

  const { invoice_id, status } = request.data as UpdateInvoiceStatusData;

  await db.collection("invoices").doc(invoice_id).update({ status });

  return { success: true };
});
