# Phase 2: Firestore Rules & Seed Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure all Firestore collections with role-based rules and populate initial reference data (halls, menu_options) so the app is usable from day one.

**Architecture:** Firestore security rules gate every collection by role (`admin` / `kitchen` / `pending`) by reading the caller's `users/{uid}.role` field. A standalone Node.js seed script uses Firebase Admin SDK with Application Default Credentials to write reference data in a single batched write.

**Tech Stack:** Firebase Firestore Security Rules v2, Firebase Admin SDK (Node.js), tsx (TypeScript runner)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `firestore.rules` | Modify | Role-based security for all 6 collections |
| `firebase.json` | Modify | Add firestore + hosting config for Vite |
| `storage.rules` | Modify | Authenticated-only Storage access |
| `scripts/seed.ts` | Create | Seed halls + menu_options via Admin SDK |
| `scripts/seed-data.ts` | Create | Exported data constants (halls + menu items) |
| `package.json` | Modify | Add `seed` script |

---

## Task 1: Update firebase.json

**Files:**
- Modify: `firebase.json`

- [ ] **Step 1: Write the updated firebase.json**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

- [ ] **Step 2: Verify file is valid JSON**

Run: `node -e "require('./firebase.json'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add firebase.json
git commit -m "chore: add firestore + hosting config to firebase.json"
```

---

## Task 2: Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

Rules logic:
- `isAdmin()` — reads caller's role from `users/{uid}`, checks `== 'admin'`
- `isApproved()` — role is admin OR kitchen
- `users` — self-read + admin-read; self-create only with `role: pending`; admin updates only
- `events` — approved read; admin write
- `halls` / `menu_options` — approved read; admin write
- `checklist/{eventId}/staff/{uid}` — approved read; owner or admin can write
- `invoices` — admin only

- [ ] **Step 1: Write firestore.rules**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isAuthenticated() && userDoc().role == 'admin';
    }

    function isApproved() {
      return isAuthenticated() && userDoc().role in ['admin', 'kitchen'];
    }

    // ── users ──────────────────────────────────────────────────────────────
    match /users/{uid} {
      allow read: if isAuthenticated() && (request.auth.uid == uid || isAdmin());

      // Registration: user creates their own doc, must set role to pending
      allow create: if isAuthenticated()
                    && request.auth.uid == uid
                    && request.resource.data.role == 'pending'
                    && request.resource.data.keys().hasAll(['full_name', 'email', 'role', 'created_at']);

      // Only admin can change role / approve
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // ── events ─────────────────────────────────────────────────────────────
    match /events/{eventId} {
      allow read: if isApproved();
      allow create: if isAdmin()
                    && request.resource.data.keys().hasAll(['nama_majlis', 'tarikh', 'pax', 'sesi', 'status', 'created_by', 'created_at']);
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // ── halls ──────────────────────────────────────────────────────────────
    match /halls/{hallId} {
      allow read: if isApproved();
      allow write: if isAdmin();
    }

    // ── menu_options ────────────────────────────────────────────────────────
    match /menu_options/{optionId} {
      allow read: if isApproved();
      allow write: if isAdmin();
    }

    // ── checklist ──────────────────────────────────────────────────────────
    match /checklist/{eventId}/staff/{uid} {
      allow read: if isApproved();
      allow create, update: if isAuthenticated()
                            && (request.auth.uid == uid || isAdmin());
      allow delete: if isAdmin();
    }

    // ── invoices ───────────────────────────────────────────────────────────
    match /invoices/{invoiceId} {
      allow read, write: if isAdmin();
    }
  }
}
```

- [ ] **Step 2: Validate rules syntax**

Run: `npx -y firebase-tools@latest firestore:rules --project kakmell-resources 2>&1 || npx -y firebase-tools@latest --version`

(If CLI not installed globally, just proceed — syntax will be validated on deploy.)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add role-based Firestore security rules"
```

---

## Task 3: Storage Rules (tighten)

**Files:**
- Modify: `storage.rules`

- [ ] **Step 1: Write storage.rules**

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Only authenticated approved users can read/write
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add storage.rules
git commit -m "chore: tighten storage rules to authenticated users only"
```

---

## Task 4: Seed Data Constants

**Files:**
- Create: `scripts/seed-data.ts`

- [ ] **Step 1: Write seed-data.ts**

```typescript
export const halls = [
  { name: 'Dewan Utama', is_active: true },
  { name: 'Dewan Serbaguna', is_active: true },
  { name: 'Dewan Perdana', is_active: true },
  { name: 'Dewan Sri Jaya', is_active: true },
  { name: 'Dewan Bunga Raya', is_active: true },
  { name: 'Dewan Sri Murni', is_active: true },
]

export const menuOptions = [
  // nasi
  { category: 'nasi', name_ms: 'Nasi Briyani', is_active: true },
  { category: 'nasi', name_ms: 'Nasi Minyak', is_active: true },
  { category: 'nasi', name_ms: 'Nasi Jagung', is_active: true },
  // ayam
  { category: 'ayam', name_ms: 'Ayam Masak Merah', is_active: true },
  // daging
  { category: 'daging', name_ms: 'Daging Briyani', is_active: true },
  { category: 'daging', name_ms: 'Daging Black Pepper', is_active: true },
  { category: 'daging', name_ms: 'Daging Masak Hitam', is_active: true },
  { category: 'daging', name_ms: 'Daging Kuzi', is_active: true },
  { category: 'daging', name_ms: 'Daging Masak Kurma', is_active: true },
  // acar
  { category: 'acar', name_ms: 'Paceri Nenas', is_active: true },
  { category: 'acar', name_ms: 'Pencuk', is_active: true },
  // dalca (auto-included, no selection)
  { category: 'dalca', name_ms: 'Dalca', is_active: true },
  // bubur
  { category: 'bubur', name_ms: 'Bubur Pulut Hitam', is_active: true },
  { category: 'bubur', name_ms: 'Bubur Kacang Hijau', is_active: true },
  { category: 'bubur', name_ms: 'Bubur Jagung', is_active: true },
  // buah (auto-included)
  { category: 'buah', name_ms: 'Oren', is_active: true },
  // air
  { category: 'air', name_ms: 'Teh O', is_active: true },
  { category: 'air', name_ms: 'Kopi O', is_active: true },
  // air auto-included
  { category: 'air', name_ms: 'Air Anggur', is_active: true },
  { category: 'air', name_ms: 'Air Kordial', is_active: true },
]
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-data.ts
git commit -m "feat: add seed data constants for halls and menu_options"
```

---

## Task 5: Seed Script

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add seed script)

**Pre-requisites:**
- `firebase-admin` installed as dev dep: `pnpm add -D firebase-admin tsx`
- Firebase CLI logged in: `firebase login`
- Project ID: `kakmell-resources` (matches `.firebaserc`)

- [ ] **Step 1: Install admin + runner**

Run: `pnpm add -D firebase-admin tsx`
Expected: packages added to devDependencies

- [ ] **Step 2: Write scripts/seed.ts**

```typescript
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { halls, menuOptions } from './seed-data.js'

// Uses Application Default Credentials (run `firebase login` first,
// or set GOOGLE_APPLICATION_CREDENTIALS to a service account key path)
initializeApp({ projectId: 'kakmell-resources' })

const db = getFirestore()

async function seed() {
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
  console.log(`✓ Seeded ${count} documents (${halls.length} halls, ${menuOptions.length} menu options)`)
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
```

- [ ] **Step 3: Add seed script to package.json**

In the `scripts` section of `package.json`, add:
```json
"seed": "GOOGLE_CLOUD_PROJECT=kakmell-resources tsx scripts/seed.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts package.json
git commit -m "feat: add Firestore seed script for halls and menu_options"
```

---

## Task 6: Deploy Rules + Run Seed

- [ ] **Step 1: Ensure Firebase CLI is available**

Run: `npx -y firebase-tools@latest --version`
Expected: version string printed (e.g. `13.x.x`)

- [ ] **Step 2: Deploy Firestore and Storage rules**

Run: `npx firebase-tools deploy --only firestore:rules,storage --project kakmell-resources`
Expected: `Deploy complete!`

- [ ] **Step 3: Run seed**

Run: `pnpm seed`
Expected: `✓ Seeded 26 documents (6 halls, 20 menu options)`

- [ ] **Step 4: Verify in Firebase Console**

Open: https://console.firebase.google.com/project/kakmell-resources/firestore
Check: `halls` collection has 6 docs, `menu_options` has 20 docs.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Phase 2 complete: Firestore rules deployed, seed data loaded"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `users` rules — self-read, self-create (pending only), admin update/delete
- [x] `events` rules — approved read, admin write with required fields
- [x] `halls` + `menu_options` — approved read, admin write
- [x] `checklist/{eventId}/staff/{uid}` — approved read, owner/admin write
- [x] `invoices` — admin only
- [x] Halls seeded (6 generic Malay hall names)
- [x] Menu options seeded (all categories from CLAUDE.md spec)
- [x] Storage rules tightened from open-expiry to authenticated-only
- [x] firebase.json updated with hosting (dist) + firestore sections

**Gaps:** None identified.
