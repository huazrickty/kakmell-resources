# CLAUDE.md — KAKMELL RESOURCES
# Catering Business Management System

## 🎯 Project Overview
A bilingual (Malay/English) web application for KAKMELL RESOURCES catering business. Built for non-IT users — mak runs the business, bapak does the planning. The system must be simple, visual, and forgiving of mistakes.

**IMPORTANT BUSINESS CONTEXT:**
- KAKMELL RESOURCES (catering) dan ZB Group (wedding hall) adalah DUA bisnes berasingan
- Mereka berkolaborasi — Kakmell sediakan katering, ZB Group sediakan dewan
- Invoice mengalir DARI Kakmell Resources KEPADA ZB Group (bukan kepada pengantin)
- Hall staff MESTI TIDAK BOLEH nampak kiraan bahan mentah atau data dalaman Kakmell
- Kuih muih diuruskan sepenuhnya oleh ZB Group — BUKAN tanggungjawab Kakmell

## 🏗️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, role-based)
- **UI**: Tailwind CSS + shadcn/ui
- **PDF**: react-pdf or jsPDF (for invoice export)
- **Language**: Bilingual Malay/English (toggle, default Malay)

## 👥 Role System (KRITIKAL)

| Role | Siapa | Boleh Akses |
|------|-------|-------------|
| `admin` | Mak / Bapak | Semua tanpa terkecuali |
| `kitchen` | Kitchen staff Kakmell | Bahan mentah + menu per event je |
| `hall_staff` | Staff ZB Group | Tentative + event details je — TIADA ingredient data |
| `hall_owner` | Owner ZB Group | Sama macam hall_staff |

**Pending Approval Flow:**
1. Sesiapa register → status = `pending`
2. Mereka nampak "Akaun dalam semakan" screen — ZERO access
3. Admin login → approve + assign role → user dapat access

**Data Visibility Rules (enforce via Supabase RLS):**
- `ingredient_ratios` table → `admin` + `kitchen` SAHAJA
- `bookings` ingredient/menu data → hidden dari `hall_staff` + `hall_owner`
- Tentative/event flow → semua roles boleh tengok
- Revenue/payment data → `admin` SAHAJA

## 📦 Order Types

```
order_type dalam bookings table:
├── 'kenduri'  — Katering kenduri (pax-based, ada ingredient calculator)
└── 'custom'   — Custom order (masakan kampung, western dll — manual, track via invoice)
```
- Ingredient calculator HANYA untuk order_type = 'kenduri'
- Custom orders: ingredient manual, boleh tambah nota, ada invoice
- Custom orders flexible — ada pax atau tidak

## 📦 Modules (build in this order)
1. **Booking Manager** — kenduri + custom orders, event details, pax, hall, payment tracking
2. **Ingredient Calculator** — auto-calculate bahan mentah (kenduri only)
3. **Invoice Maker** — Kakmell → ZB Group invoice, export PDF
4. **Dashboard** — upcoming events, revenue stats, payment status (admin only)
5. **Menu & Recipe Manager** — admin page to update ingredient ratios
6. **Auth & Roles** — register, pending approval, role assignment, RLS

## 🗄️ Database Schema

### Table: user_profiles
```sql
id           uuid PRIMARY KEY REFERENCES auth.users(id)
full_name    text
email        text
role         text DEFAULT 'pending'  -- pending | admin | kitchen | hall_staff | hall_owner
approved_at  timestamptz
approved_by  uuid REFERENCES user_profiles(id)
created_at   timestamptz DEFAULT now()
```

### Table: bookings
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_type       text DEFAULT 'kenduri'  -- 'kenduri' | 'custom'
client_name      text NOT NULL
event_date       date NOT NULL
hall_name        text
pax              integer  -- nullable untuk custom orders
package_price    decimal(10,2)
addons           jsonb DEFAULT '[]'
total_amount     decimal(10,2)
deposit_paid     decimal(10,2) DEFAULT 0
payments         jsonb DEFAULT '[]'   -- [{date, amount, note}]
status           text DEFAULT 'confirmed'  -- confirmed | completed | cancelled
notes            text
tentative        text   -- event flow, visible to hall roles
menu_selection   jsonb  -- HIDDEN from hall roles via RLS
created_at       timestamptz DEFAULT now()
```

### Table: ingredient_ratios
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
category     text NOT NULL
item_name    text NOT NULL
pax_300      jsonb
pax_400      jsonb
pax_500      jsonb
pax_600      jsonb
pax_700      jsonb
pax_800      jsonb
pax_900      jsonb
pax_1000     jsonb
notes        text
-- RLS: admin + kitchen ONLY
```

### Table: menu_options
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
category     text NOT NULL   -- 'nasi' | 'ayam' | 'daging' | 'acar' | 'dalca' | 'bubur' | 'buah' | 'air'
-- NOTE: 'kuih' category REMOVED — handled by ZB Group, not Kakmell
name_ms      text NOT NULL
name_en      text
is_active    boolean DEFAULT true
UNIQUE (category, name_ms)
```

### Table: invoices
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
booking_id   uuid REFERENCES bookings(id)
invoice_no   text UNIQUE  -- INV-YYYY-NNN
issued_date  date DEFAULT CURRENT_DATE
-- Invoice is FROM Kakmell Resources TO ZB Group
billed_to    text DEFAULT 'ZB Group'
items        jsonb   -- line items
subtotal     decimal(10,2)
total        decimal(10,2)
status       text DEFAULT 'draft'  -- draft | sent | paid
pdf_url      text
created_at   timestamptz DEFAULT now()
-- RLS: admin ONLY
```

## 🧮 Ingredient Calculator Logic

### Key Rules (CRITICAL — do not change these):
1. Use **lookup table** approach (NOT linear interpolation) — match exact pax bracket
2. Pax brackets: 300, 400, 500, 600, 700, 800, 900, 1000
3. If pax is between brackets (e.g. 650), **round UP** to next bracket (700)
4. If pax < 300, use 300 bracket
5. If pax > 1000, flag as "custom calculation needed"

### Main Items Lookup Table (beras basmati):
| Pax  | Beras(bag) | Ayam(ekor) | Daging(kg) | Nenas/Paceri(biji) | Oren(biji) | Gula(L) |
|------|-----------|------------|------------|-------------------|-----------|---------|
| 300  | 2         | 20         | 18         | 20                | 25        | 10      |
| 400  | 3         | 28         | 24         | 25                | 30        | 10      |
| 500  | 3.5       | 35         | 30         | 35                | 30        | 15      |
| 600  | 4         | 42         | 36         | 40                | 30        | 20      |
| 700  | 4.5       | 50         | 42         | 45                | 30        | 20      |
| 800  | 5.5       | 55         | 48         | 50                | 30        | 25      |
| 900  | 6         | 65         | 54         | 60                | 35        | 30      |
| 1000 | 7         | 70         | 60         | 70                | 40        | 30      |

### Daging Box Calculation:
- **Slice box** = 17kg raw → 10-11kg after boiling (7 gayung)
- **Trimming box** = 22kg raw → hancur if too much, max 1 kotak regardless of pax
- Formula: `slice_boxes = ceil(daging_kg / 17)`, `trimming_boxes = 1 (fixed cap)`
- Show: boxes needed + kg lebih/kurang (variance)

### Dalca Ingredients Lookup (non-linear, use exact table):
| Pax  | Kacang Dall | Terung  | Kentang    | Karot   | Kacang Panjang | Serbuk Kari |
|------|------------|---------|------------|---------|----------------|-------------|
| 300  | 1kg        | 2kg     | 1 bag      | 10 biji | 1kg            | 0.5kg       |
| 400  | 1kg        | 2.5kg   | 1 bag      | 3.5kg   | 1kg            | —           |
| 500  | 1.5kg      | 3kg     | 1 bag      | —       | 1.5kg          | 1kg         |
| 600  | 2kg        | 3.5kg   | 1.5 bag    | —       | 1.5kg          | 1kg         |
| 700  | 2kg        | 4kg     | 1.5 bag    | —       | 2kg            | —           |
| 800  | 2.5kg      | 5kg     | 1.5 bag+kotak(4.5kg) | kotak 4.5kg | 2kg | — |
| 900  | 3kg        | 6kg     | 2 bag      | 6kg     | 2.5kg          | —           |
| 1000 | 3kg (CAP)  | 7kg     | 2 bag      | 7kg     | 3kg            | 2kg         |

### Bubur & Dessert Lookup:
| Item                  | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 |
|-----------------------|-----|-----|-----|-----|-----|-----|-----|------|
| Pulut Hitam (kg)      | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2    |
| Santan Pulut (tin)    | 1   | 1   | 1   | 1   | 1   | 1   | 1   | 1    |
| Kacang Hijau (kg)     | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2    |
| Santan Kacang (tin)   | 1   | 1   | 1   | 1   | 1   | 1   | 1   | 1    |
| Bubur Jagung (beg)    | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2    |
| — Jagung (kg)         | 4   | 4   | 4   | 4   | 4   | 4   | 4   | 4    |
| Santan Jagung (kotak) | 2   | 2   | 2   | 2   | 2   | 2   | 2   | 2    |

### Acar & Paceri Lookup:
| Item              | 300  | 400 | 500  | 600 | 700  | 800  | 1000 |
|-------------------|------|-----|------|-----|------|------|------|
| Timun/Acar (kg)   | 10   | —   | 15   | —   | 20   | 25   | 30   |
| Nenas/Acar (biji) | 10   | —   | 10   | —   | 10   | 12   | 20   |
| Paceri Nenas(biji)| 20   | 25  | 35   | 40  | 45   | 50   | 70   |

## 🍽️ Menu Options by Category

### Nasi (pilih 1):
- Nasi Briyani / Nasi Minyak / Nasi Jagung

### Ayam (pilih 1):
- Ayam Masak Merah (default)

### Daging (pilih 1):
- Daging Briyani / Daging Black Pepper / Daging Masak Hitam / Daging Kuzi / Daging Masak Kurma

### Acar (pilih 1):
- Paceri Nenas / Pencuk

### Dalca: (standard, selalu ada)

### Bubur (pilih 1):
- Bubur Pulut Hitam / Bubur Kacang Hijau / Bubur Jagung

### Buah: Oren (standard)

### Air: Anggur/Kordial (standard) + Teh O/Kopi O (pilih 1)

### Kuih — BUKAN tanggungjawab Kakmell
Kuih muih diuruskan oleh ZB Group sepenuhnya. Tiada dalam sistem Kakmell.

## 💰 Invoice Rules
- Invoice FROM: KAKMELL RESOURCES
- Invoice TO: ZB Group
- Format nombor: INV-YYYY-NNN (cth: INV-2026-001)
- Line items: harga pakej katering + add-ons Kakmell je
- Tunjuk: payment history + outstanding balance
- Export PDF, bilingual header

## 🎨 UI/UX Rules (CRITICAL for non-IT users)
1. **No jargon** — label semua dalam Malay, simple words
2. **Big buttons** — minimum tap target 48px
3. **Confirmation dialogs** before any delete/edit
4. **Auto-save** drafts where possible
5. **Mobile-first** — mak guna phone, bukan laptop
6. **Color coding**: Green = paid/completed, Orange = pending, Red = overdue/balance
7. **Calculator shows working** — tunjuk "500 pax × 0.7 bag/100pax = 3.5 bag beras"
8. Dashboard shows upcoming events sorted by date (nearest first)

## 🚫 Do NOT
- Do not use complex form validation that blocks submission
- Do not require all fields — keep optional fields truly optional
- Do not paginate ingredient results — show all on one page
- Do not use dark mode as default (mak prefers bright/clean)

## 📁 Folder Structure
```
/app
  /dashboard          -- home page, upcoming events
  /bookings
    /new              -- create booking
    /[id]             -- view/edit booking
  /calculator         -- standalone ingredient calculator  
  /invoices
    /[id]             -- view/generate invoice
  /settings           -- menu options, hall list, pricing
/components
  /booking-form
  /ingredient-table
  /invoice-template
  /payment-tracker
/lib
  /supabase.ts
  /ingredient-calculator.ts   -- lookup table logic
  /invoice-generator.ts
```

## 🔄 Key User Flows

### Flow 1: New Booking masuk
Dashboard → "Tambah Booking Baru" → Isi nama client, tarikh, hall, pax → Pilih menu → Sistem auto-calculate bahan mentah → Preview → Simpan

### Flow 2: Semak bahan mentah
Booking detail → Tab "Bahan Mentah" → Tunjuk senarai ingredients dengan quantity → Boleh print/screenshot

### Flow 3: Jana invoice
Booking detail → Tab "Invoice" → Semak line items → "Jana PDF" → Simpan/Share

### Flow 4: Record payment
Booking detail → Tab "Pembayaran" → "Tambah Bayaran" → Masuk amount + tarikh → Balance auto-update

## 💡 Development Notes
- Seed the ingredient_ratios table with all lookup data above on first run
- Seed menu_options table with all menu items above
- Calculator must work OFFLINE (compute locally from seeded data, no API call needed)
- Invoice PDF generation happens client-side
- Keep API routes minimal — most logic should be in lib/ utility functions
