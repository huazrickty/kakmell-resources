# CLAUDE.md — KAKMELL RESOURCES
# Catering Business Management System

## 🎯 Project Overview
A bilingual (Malay/English) web application for a catering business. Built for non-IT users — mak runs the business, bapak does the planning. The system must be simple, visual, and forgiving of mistakes.

## 🏗️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, single user family account)
- **UI**: Tailwind CSS + shadcn/ui
- **PDF**: react-pdf or jsPDF (for invoice export)
- **Language**: Bilingual Malay/English (toggle, default Malay)

## 📦 Modules (build in this order)
1. **Booking Manager** — client info, event details, pax, hall, payment tracking
2. **Ingredient Calculator** — auto-calculate raw materials based on pax + menu selection
3. **Invoice Maker** — generate & export invoice PDF
4. **Dashboard** — upcoming events, revenue stats, payment status
5. **Menu & Recipe Manager** — admin page to update ingredient ratios (rarely used)

## 🗄️ Database Schema

### Table: bookings
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
client_name      text NOT NULL
event_date       date NOT NULL
hall_name        text
pax              integer NOT NULL
package_price    decimal(10,2)
addons           jsonb DEFAULT '[]'
total_amount     decimal(10,2)
deposit_paid     decimal(10,2) DEFAULT 0
payments         jsonb DEFAULT '[]'   -- array of {date, amount, note}
balance          decimal(10,2) GENERATED ALWAYS AS (total_amount - deposit_paid) STORED
status           text DEFAULT 'confirmed' -- confirmed | completed | cancelled
notes            text
tentative        text  -- full event flow/tentative text
menu_selection   jsonb  -- selected menu items per category
created_at       timestamptz DEFAULT now()
```

### Table: ingredient_ratios
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
category     text NOT NULL   -- 'main' | 'dalca' | 'bubur' | 'acar' | 'paceri'
item_name    text NOT NULL
pax_300      jsonb  -- {qty, unit}
pax_400      jsonb
pax_500      jsonb
pax_600      jsonb
pax_700      jsonb
pax_800      jsonb
pax_900      jsonb
pax_1000     jsonb
notes        text   -- e.g. "cap at 1000", "trimming max 1 box"
```

### Table: menu_options
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
category     text NOT NULL   -- 'nasi' | 'ayam' | 'daging' | 'acar' | 'dalca' | 'bubur' | 'buah' | 'air' | 'kuih'
name_ms      text NOT NULL   -- Malay name
name_en      text
is_active    boolean DEFAULT true
```

### Table: invoices
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
booking_id   uuid REFERENCES bookings(id)
invoice_no   text UNIQUE  -- e.g. INV-2026-001
issued_date  date DEFAULT CURRENT_DATE
items        jsonb   -- line items array
subtotal     decimal(10,2)
total        decimal(10,2)
status       text DEFAULT 'draft'  -- draft | sent | paid
pdf_url      text
created_at   timestamptz DEFAULT now()
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
| Item           | 300  | 400 | 500 | 600 | 700 | 800 | 900 | 1000 |
|----------------|------|-----|-----|-----|-----|-----|-----|------|
| Pulut Hitam(kg)| 1.5  | 2   | 2   | 2   | 2   | 3   | 3   | 4    |
| Santan (tin)   | 1    | 1   | 1   | 1   | 1   | 2   | 2   | 2    |
| Kacang Hijau(kg)| 1.5 | 2   | 2   | 2   | 2   | 3   | 3   | 3    |
| Bubur Jagung(kg)| 2   | 3   | 4   | 5   | 6   | 7   | 8   | 10   |

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
- Daging Briyani / Daging Black Pepper / Daging Masak Hitam / Daging Kuzi / Daging Masak Lemak Hitam / Daging Masak Kurma

### Acar (pilih 1):
- Paceri Nenas / Pencuk

### Dalca: (standard, selalu ada)

### Bubur (pilih 1):
- Bubur Pulut Hitam / Bubur Kacang Hijau / Bubur Jagung

### Buah: Oren (standard)

### Air: Anggur/Kordial (standard) + Teh O/Kopi O (pilih 1)

### Kuih (pilih 2):
- Karipap / Kasui Gedik / Cara Lauk / Cara Manis / Seri Muka / Kole Kacang / Apam Gula Hangus / Koci

## 📋 Hall List
- Asmara Hall
- Juwita Hall  
- Elham Hall
(boleh tambah dalam admin settings)

## 💰 Invoice Rules
- Invoice number format: INV-YYYY-NNN (e.g. INV-2026-001)
- Show: Package price + line items for addons
- Show: Payment history (deposit + subsequent payments)
- Show: Outstanding balance
- Export to PDF
- Bilingual header

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
