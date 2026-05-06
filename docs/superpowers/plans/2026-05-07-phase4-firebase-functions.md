# Phase 4: Firebase Functions (Gen 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 Gen 2 onCall Cloud Functions (approveUser, changeUserRole, generateWeeklyExportData, createInvoice, updateInvoiceStatus) in the existing `functions/` workspace, type-check clean, and deploy to the `kakmell-resources` Firebase project.

**Architecture:** Two files inside `functions/src/` — a server-side copy of the ingredient calculator (`ingredient-calculator.ts`) and the main function exports (`index.ts`). All functions use `onCall` from `firebase-functions/v2/https` and access Firestore via `firebase-admin`. The `functions/` directory is its own pnpm workspace with independent dependencies and a `NodeNext` TypeScript config requiring `.js` extensions on local imports.

**Tech Stack:** firebase-functions v7 (v2 API), firebase-admin v13, TypeScript 6, pnpm (in functions/ subdirectory), Node 18

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `functions/package.json` | Modify | Set node engine to 18 |
| `functions/src/ingredient-calculator.ts` | Create | Server-side lookup tables + `calculateIngredients()` |
| `functions/src/index.ts` | Replace | All 5 exported onCall functions |

---

## Task 1: Install dependencies and fix Node engine

**Files:**
- Modify: `functions/package.json`

- [ ] **Step 1: Update node engine to 18**

Edit `functions/package.json` — change `"node": "24"` to `"node": "18"`:

```json
{
  "name": "functions",
  "scripts": {
    "lint": "eslint --ext .js,.ts .",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^13.6.0",
    "firebase-functions": "^7.0.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.12.0",
    "@typescript-eslint/parser": "^5.12.0",
    "eslint": "^8.9.0",
    "eslint-config-google": "^0.14.0",
    "eslint-plugin-import": "^2.25.4",
    "firebase-functions-test": "^3.4.1",
    "typescript": "^6.0.0"
  },
  "private": true
}
```

- [ ] **Step 2: Install dependencies**

Run (from project root, not functions/):
```bash
cd functions && pnpm install
```

Expected: `node_modules/` created inside `functions/`, `firebase-admin` and `firebase-functions` present.

- [ ] **Step 3: Verify tsc is available**

Run:
```bash
cd functions && npx tsc --version
```

Expected: `Version 6.x.x`

- [ ] **Step 4: Commit**

```bash
git add functions/package.json functions/pnpm-lock.yaml
git commit -m "chore: set functions node engine to 18, install deps"
```

---

## Task 2: Server-side ingredient calculator

**Files:**
- Create: `functions/src/ingredient-calculator.ts`

This is a server-side copy of `src/lib/ingredient-calculator.ts` with the return shape renamed to match the `generateWeeklyExportData` output spec (`mainItems` instead of `main`, `dagingBoxes` instead of `daging_box`).

- [ ] **Step 1: Create `functions/src/ingredient-calculator.ts`**

```typescript
// Server-side ingredient lookup tables.
// Mirrors src/lib/ingredient-calculator.ts — keep in sync if spec changes.

export interface MainIngredients {
  beras_bag: number;
  ayam_ekor: number;
  daging_kg: number;
  paceri_nenas_biji: number;
  oren_biji: number;
  gula_liter: number;
}

export interface DagingBox {
  slice_boxes: number;
  trim_boxes: 1;
  variance_kg: number;
}

export interface DalcaIngredients {
  kacang_dall: string;
  terung: string;
  kentang: string;
  karot: string | null;
  kacang_panjang: string;
  serbuk_kari: string | null;
}

export interface BuburIngredients {
  pulut_hitam: { beras_pulut_kg: number; santan_tin: number };
  kacang_hijau: { kacang_kg: number; santan_tin: number };
  jagung: { beg: number; beras_kg: number; santan_kotak: number };
}

export interface AcarIngredients {
  timun_kg: number | null;
  nenas_biji: number | null;
  paceri_nenas_biji: number;
}

export interface IngredientResult {
  bracket: number;
  mainItems: MainIngredients;
  dagingBoxes: DagingBox;
  dalca: DalcaIngredients;
  bubur: BuburIngredients;
  acar: AcarIngredients;
}

const BRACKETS = [300, 400, 500, 600, 700, 800, 900, 1000] as const;
type Bracket = typeof BRACKETS[number];

function getBracket(pax: number): number {
  if (pax > 1000) return -1;
  for (const b of BRACKETS) {
    if (pax <= b) return b;
  }
  return -1;
}

function getDagingBox(daging_kg: number): DagingBox {
  const slice_boxes = Math.ceil(daging_kg / 17);
  return { slice_boxes, trim_boxes: 1, variance_kg: slice_boxes * 17 - daging_kg };
}

const MAIN_TABLE: Record<Bracket, MainIngredients> = {
  300:  { beras_bag: 2,   ayam_ekor: 20, daging_kg: 18, paceri_nenas_biji: 20, oren_biji: 25, gula_liter: 10 },
  400:  { beras_bag: 3,   ayam_ekor: 28, daging_kg: 24, paceri_nenas_biji: 25, oren_biji: 30, gula_liter: 10 },
  500:  { beras_bag: 3.5, ayam_ekor: 35, daging_kg: 30, paceri_nenas_biji: 35, oren_biji: 30, gula_liter: 15 },
  600:  { beras_bag: 4,   ayam_ekor: 42, daging_kg: 36, paceri_nenas_biji: 40, oren_biji: 30, gula_liter: 20 },
  700:  { beras_bag: 4.5, ayam_ekor: 50, daging_kg: 42, paceri_nenas_biji: 45, oren_biji: 30, gula_liter: 20 },
  800:  { beras_bag: 5.5, ayam_ekor: 55, daging_kg: 48, paceri_nenas_biji: 50, oren_biji: 30, gula_liter: 25 },
  900:  { beras_bag: 6,   ayam_ekor: 65, daging_kg: 54, paceri_nenas_biji: 60, oren_biji: 35, gula_liter: 30 },
  1000: { beras_bag: 7,   ayam_ekor: 70, daging_kg: 60, paceri_nenas_biji: 70, oren_biji: 40, gula_liter: 30 },
};

const DALCA_TABLE: Record<Bracket, DalcaIngredients> = {
  300:  { kacang_dall: "1kg",   terung: "2kg",   kentang: "1 bag",                   karot: "10 biji",       kacang_panjang: "1kg",   serbuk_kari: "0.5kg" },
  400:  { kacang_dall: "1kg",   terung: "2.5kg", kentang: "1 bag",                   karot: "3.5kg",         kacang_panjang: "1kg",   serbuk_kari: null    },
  500:  { kacang_dall: "1.5kg", terung: "3kg",   kentang: "1 bag",                   karot: null,            kacang_panjang: "1.5kg", serbuk_kari: "1kg"   },
  600:  { kacang_dall: "2kg",   terung: "3.5kg", kentang: "1.5 bag",                 karot: null,            kacang_panjang: "1.5kg", serbuk_kari: "1kg"   },
  700:  { kacang_dall: "2kg",   terung: "4kg",   kentang: "1.5 bag",                 karot: null,            kacang_panjang: "2kg",   serbuk_kari: null    },
  800:  { kacang_dall: "2.5kg", terung: "5kg",   kentang: "1.5 bag + kotak (4.5kg)", karot: "kotak (4.5kg)", kacang_panjang: "2kg",   serbuk_kari: null    },
  900:  { kacang_dall: "3kg",   terung: "6kg",   kentang: "2 bag",                   karot: "6kg",           kacang_panjang: "2.5kg", serbuk_kari: null    },
  1000: { kacang_dall: "3kg",   terung: "7kg",   kentang: "2 bag",                   karot: "7kg",           kacang_panjang: "3kg",   serbuk_kari: "2kg"   },
};

const BUBUR: BuburIngredients = {
  pulut_hitam: { beras_pulut_kg: 2, santan_tin: 1 },
  kacang_hijau: { kacang_kg: 2, santan_tin: 1 },
  jagung: { beg: 2, beras_kg: 4, santan_kotak: 2 },
};

const ACAR_TABLE: Record<Bracket, AcarIngredients> = {
  300:  { timun_kg: 10,   nenas_biji: 10,   paceri_nenas_biji: 20 },
  400:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 25 },
  500:  { timun_kg: 15,   nenas_biji: 10,   paceri_nenas_biji: 35 },
  600:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 40 },
  700:  { timun_kg: 20,   nenas_biji: 10,   paceri_nenas_biji: 45 },
  800:  { timun_kg: 25,   nenas_biji: 12,   paceri_nenas_biji: 50 },
  900:  { timun_kg: null, nenas_biji: null,  paceri_nenas_biji: 60 },
  1000: { timun_kg: 30,   nenas_biji: 20,   paceri_nenas_biji: 70 },
};

export function calculateIngredients(pax: number): IngredientResult | null {
  const bracket = getBracket(pax);
  if (bracket === -1) return null;
  const b = bracket as Bracket;
  const mainItems = MAIN_TABLE[b];
  return {
    bracket,
    mainItems,
    dagingBoxes: getDagingBox(mainItems.daging_kg),
    dalca: DALCA_TABLE[b],
    bubur: BUBUR,
    acar: ACAR_TABLE[b],
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/ingredient-calculator.ts
git commit -m "feat: add server-side ingredient calculator for Cloud Functions"
```

---

## Task 3: All 5 Cloud Functions

**Files:**
- Replace: `functions/src/index.ts`

**Import note:** NodeNext module resolution requires `.js` extension on local imports even though the source file is `.ts`.

- [ ] **Step 1: Write `functions/src/index.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: implement 5 Gen 2 Cloud Functions (approveUser, changeUserRole, generateWeeklyExportData, createInvoice, updateInvoiceStatus)"
```

---

## Task 4: Type check

**Files:** (none modified)

- [ ] **Step 1: Run tsc --noEmit inside functions/**

```bash
cd functions && npx tsc --noEmit
```

Expected: no output, exit code 0.

If errors appear:
- `Cannot find module './ingredient-calculator.js'` → The `.js` extension is correct for NodeNext; ensure file exists at `functions/src/ingredient-calculator.ts`
- `Property 'auth' does not exist` → Use `request.auth` not `context.auth` (v2 API)
- `Object is possibly 'undefined'` → Add `?.` or null checks

- [ ] **Step 2: Commit if any fixes were needed**

```bash
git add functions/src/
git commit -m "fix: resolve TypeScript errors in functions"
```

---

## Task 5: Deploy

- [ ] **Step 1: Deploy functions**

Run from project root:
```bash
npx -y firebase-tools@latest deploy --only functions --project kakmell-resources
```

Expected output includes:
```
✔  functions: Finished running predeploy script.
✔  Deploy complete!
```

- [ ] **Step 2: List deployed functions**

```bash
npx firebase-tools functions:list --project kakmell-resources
```

Expected: table showing all 5 functions — `approveUser`, `changeUserRole`, `generateWeeklyExportData`, `createInvoice`, `updateInvoiceStatus` — all with status `ACTIVE`.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 4 complete — 5 Cloud Functions deployed to kakmell-resources"
```

---

## Self-Review

**Spec coverage:**
- [x] `approveUser` — onCall, auth check, admin verify, updates role + approved_at + approved_by
- [x] `changeUserRole` — onCall, auth check, devPassword === "881188", updates role
- [x] `generateWeeklyExportData` — onCall, admin only, queries by tarikh range, returns event + ingredients array
- [x] `createInvoice` — onCall, admin only, auto invoice_no (INV-YYYY-NNN), recalculates totals server-side, saves to Firestore
- [x] `updateInvoiceStatus` — onCall, admin only, updates status field
- [x] Node 18 engine set
- [x] firebase-functions v2 (`onCall` from `firebase-functions/v2/https`)
- [x] `.js` extension on local import (NodeNext requirement)
- [x] tsc --noEmit verification step
- [x] Deploy + list step

**Placeholders:** None.

**Type consistency:**
- `assertAdmin(uid: string)` used consistently in approveUser, generateWeeklyExportData, createInvoice, updateInvoiceStatus ✓
- `calculateIngredients` imported from `./ingredient-calculator.js`, returns `IngredientResult | null` ✓
- `FieldValue.serverTimestamp()` used for both `invoice_date` and `created_at` in createInvoice ✓
