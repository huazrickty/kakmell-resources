// ============================================================
// KAKMELL RESOURCES — Seed Data
// All ingredient ratios and menu options from CLAUDE.md
// ============================================================

export const INGREDIENT_RATIOS_SEED = [
  // ---- MAIN (beras basmati table) ----
  {
    category: 'main', item_name: 'Beras Basmati',
    pax_300: { qty: 2, unit: 'bag' }, pax_400: { qty: 3, unit: 'bag' },
    pax_500: { qty: 3.5, unit: 'bag' }, pax_600: { qty: 4, unit: 'bag' },
    pax_700: { qty: 4.5, unit: 'bag' }, pax_800: { qty: 5.5, unit: 'bag' },
    pax_900: { qty: 6, unit: 'bag' }, pax_1000: { qty: 7, unit: 'bag' },
  },
  {
    category: 'main', item_name: 'Ayam',
    pax_300: { qty: 20, unit: 'ekor' }, pax_400: { qty: 28, unit: 'ekor' },
    pax_500: { qty: 35, unit: 'ekor' }, pax_600: { qty: 42, unit: 'ekor' },
    pax_700: { qty: 50, unit: 'ekor' }, pax_800: { qty: 55, unit: 'ekor' },
    pax_900: { qty: 65, unit: 'ekor' }, pax_1000: { qty: 70, unit: 'ekor' },
  },
  {
    category: 'main', item_name: 'Daging',
    pax_300: { qty: 18, unit: 'kg' }, pax_400: { qty: 24, unit: 'kg' },
    pax_500: { qty: 30, unit: 'kg' }, pax_600: { qty: 36, unit: 'kg' },
    pax_700: { qty: 42, unit: 'kg' }, pax_800: { qty: 48, unit: 'kg' },
    pax_900: { qty: 54, unit: 'kg' }, pax_1000: { qty: 60, unit: 'kg' },
  },
  {
    category: 'main', item_name: 'Nenas / Paceri',
    pax_300: { qty: 20, unit: 'biji' }, pax_400: { qty: 25, unit: 'biji' },
    pax_500: { qty: 35, unit: 'biji' }, pax_600: { qty: 40, unit: 'biji' },
    pax_700: { qty: 45, unit: 'biji' }, pax_800: { qty: 50, unit: 'biji' },
    pax_900: { qty: 60, unit: 'biji' }, pax_1000: { qty: 70, unit: 'biji' },
  },
  {
    category: 'main', item_name: 'Oren',
    pax_300: { qty: 25, unit: 'biji' }, pax_400: { qty: 30, unit: 'biji' },
    pax_500: { qty: 30, unit: 'biji' }, pax_600: { qty: 30, unit: 'biji' },
    pax_700: { qty: 30, unit: 'biji' }, pax_800: { qty: 30, unit: 'biji' },
    pax_900: { qty: 35, unit: 'biji' }, pax_1000: { qty: 40, unit: 'biji' },
  },
  {
    category: 'main', item_name: 'Gula / Air',
    pax_300: { qty: 10, unit: 'L' }, pax_400: { qty: 10, unit: 'L' },
    pax_500: { qty: 15, unit: 'L' }, pax_600: { qty: 20, unit: 'L' },
    pax_700: { qty: 20, unit: 'L' }, pax_800: { qty: 25, unit: 'L' },
    pax_900: { qty: 30, unit: 'L' }, pax_1000: { qty: 30, unit: 'L' },
  },

  // ---- DALCA ----
  {
    category: 'dalca', item_name: 'Kacang Dall',
    pax_300: { qty: '1', unit: 'kg' }, pax_400: { qty: '1', unit: 'kg' },
    pax_500: { qty: '1.5', unit: 'kg' }, pax_600: { qty: '2', unit: 'kg' },
    pax_700: { qty: '2', unit: 'kg' }, pax_800: { qty: '2.5', unit: 'kg' },
    pax_900: { qty: '3', unit: 'kg' }, pax_1000: { qty: '3', unit: 'kg', note: 'CAP' },
  },
  {
    category: 'dalca', item_name: 'Terung',
    pax_300: { qty: '2', unit: 'kg' }, pax_400: { qty: '2.5', unit: 'kg' },
    pax_500: { qty: '3', unit: 'kg' }, pax_600: { qty: '3.5', unit: 'kg' },
    pax_700: { qty: '4', unit: 'kg' }, pax_800: { qty: '5', unit: 'kg' },
    pax_900: { qty: '6', unit: 'kg' }, pax_1000: { qty: '7', unit: 'kg' },
  },
  {
    category: 'dalca', item_name: 'Kentang',
    pax_300: { qty: '1', unit: 'bag' }, pax_400: { qty: '1', unit: 'bag' },
    pax_500: { qty: '1', unit: 'bag' }, pax_600: { qty: '1.5', unit: 'bag' },
    pax_700: { qty: '1.5', unit: 'bag' }, pax_800: { qty: '1.5 bag + kotak', unit: '(4.5 kg)' },
    pax_900: { qty: '2', unit: 'bag' }, pax_1000: { qty: '2', unit: 'bag' },
  },
  {
    category: 'dalca', item_name: 'Karot',
    pax_300: { qty: '10', unit: 'biji' }, pax_400: { qty: '3.5', unit: 'kg' },
    pax_500: null, pax_600: null, pax_700: null,
    pax_800: { qty: 'kotak', unit: '4.5 kg' },
    pax_900: { qty: '6', unit: 'kg' }, pax_1000: { qty: '7', unit: 'kg' },
  },
  {
    category: 'dalca', item_name: 'Kacang Panjang',
    pax_300: { qty: '1', unit: 'kg' }, pax_400: { qty: '1', unit: 'kg' },
    pax_500: { qty: '1.5', unit: 'kg' }, pax_600: { qty: '1.5', unit: 'kg' },
    pax_700: { qty: '2', unit: 'kg' }, pax_800: { qty: '2', unit: 'kg' },
    pax_900: { qty: '2.5', unit: 'kg' }, pax_1000: { qty: '3', unit: 'kg' },
  },
  {
    category: 'dalca', item_name: 'Serbuk Kari',
    pax_300: { qty: '0.5', unit: 'kg' }, pax_400: null,
    pax_500: { qty: '1', unit: 'kg' }, pax_600: { qty: '1', unit: 'kg' },
    pax_700: null, pax_800: null, pax_900: null,
    pax_1000: { qty: '2', unit: 'kg' },
  },

  // ---- BUBUR ----
  {
    category: 'bubur', item_name: 'Pulut Hitam',
    pax_300: { qty: 1.5, unit: 'kg' }, pax_400: { qty: 2, unit: 'kg' },
    pax_500: { qty: 2, unit: 'kg' }, pax_600: { qty: 2, unit: 'kg' },
    pax_700: { qty: 2, unit: 'kg' }, pax_800: { qty: 3, unit: 'kg' },
    pax_900: { qty: 3, unit: 'kg' }, pax_1000: { qty: 4, unit: 'kg' },
  },
  {
    category: 'bubur', item_name: 'Santan',
    pax_300: { qty: 1, unit: 'tin' }, pax_400: { qty: 1, unit: 'tin' },
    pax_500: { qty: 1, unit: 'tin' }, pax_600: { qty: 1, unit: 'tin' },
    pax_700: { qty: 1, unit: 'tin' }, pax_800: { qty: 2, unit: 'tin' },
    pax_900: { qty: 2, unit: 'tin' }, pax_1000: { qty: 2, unit: 'tin' },
  },
  {
    category: 'bubur', item_name: 'Kacang Hijau',
    pax_300: { qty: 1.5, unit: 'kg' }, pax_400: { qty: 2, unit: 'kg' },
    pax_500: { qty: 2, unit: 'kg' }, pax_600: { qty: 2, unit: 'kg' },
    pax_700: { qty: 2, unit: 'kg' }, pax_800: { qty: 3, unit: 'kg' },
    pax_900: { qty: 3, unit: 'kg' }, pax_1000: { qty: 3, unit: 'kg' },
  },
  {
    category: 'bubur', item_name: 'Bubur Jagung',
    pax_300: { qty: 2, unit: 'kg' }, pax_400: { qty: 3, unit: 'kg' },
    pax_500: { qty: 4, unit: 'kg' }, pax_600: { qty: 5, unit: 'kg' },
    pax_700: { qty: 6, unit: 'kg' }, pax_800: { qty: 7, unit: 'kg' },
    pax_900: { qty: 8, unit: 'kg' }, pax_1000: { qty: 10, unit: 'kg' },
  },

  // ---- ACAR ----
  {
    category: 'acar', item_name: 'Timun / Acar',
    pax_300: { qty: 10, unit: 'kg' }, pax_400: null,
    pax_500: { qty: 15, unit: 'kg' }, pax_600: null,
    pax_700: { qty: 20, unit: 'kg' }, pax_800: { qty: 25, unit: 'kg' },
    pax_900: null, pax_1000: { qty: 30, unit: 'kg' },
  },
  {
    category: 'acar', item_name: 'Nenas / Acar',
    pax_300: { qty: 10, unit: 'biji' }, pax_400: null,
    pax_500: { qty: 10, unit: 'biji' }, pax_600: null,
    pax_700: { qty: 10, unit: 'biji' }, pax_800: { qty: 12, unit: 'biji' },
    pax_900: null, pax_1000: { qty: 20, unit: 'biji' },
  },

  // ---- PACERI ----
  {
    category: 'paceri', item_name: 'Paceri Nenas',
    pax_300: { qty: 20, unit: 'biji' }, pax_400: { qty: 25, unit: 'biji' },
    pax_500: { qty: 35, unit: 'biji' }, pax_600: { qty: 40, unit: 'biji' },
    pax_700: { qty: 45, unit: 'biji' }, pax_800: { qty: 50, unit: 'biji' },
    pax_900: null, pax_1000: { qty: 70, unit: 'biji' },
  },
]

export const MENU_OPTIONS_SEED = [
  // Nasi
  { category: 'nasi', name_ms: 'Nasi Briyani', name_en: 'Biryani Rice' },
  { category: 'nasi', name_ms: 'Nasi Minyak', name_en: 'Ghee Rice' },
  { category: 'nasi', name_ms: 'Nasi Jagung', name_en: 'Corn Rice' },

  // Ayam
  { category: 'ayam', name_ms: 'Ayam Masak Merah', name_en: 'Red-Cooked Chicken' },

  // Daging
  { category: 'daging', name_ms: 'Daging Briyani', name_en: 'Beef Biryani' },
  { category: 'daging', name_ms: 'Daging Black Pepper', name_en: 'Black Pepper Beef' },
  { category: 'daging', name_ms: 'Daging Masak Hitam', name_en: 'Black Sauce Beef' },
  { category: 'daging', name_ms: 'Daging Kuzi', name_en: 'Beef Qouzi' },
  { category: 'daging', name_ms: 'Daging Masak Kurma', name_en: 'Beef Korma' },

  // Acar
  { category: 'acar', name_ms: 'Paceri Nenas', name_en: 'Pineapple Paceri' },
  { category: 'acar', name_ms: 'Pencuk', name_en: 'Mixed Pickle' },

  // Dalca (standard)
  { category: 'dalca', name_ms: 'Dalca', name_en: 'Dhal Curry' },

  // Bubur
  { category: 'bubur', name_ms: 'Bubur Pulut Hitam', name_en: 'Black Glutinous Rice Porridge' },
  { category: 'bubur', name_ms: 'Bubur Kacang Hijau', name_en: 'Green Bean Porridge' },
  { category: 'bubur', name_ms: 'Bubur Jagung', name_en: 'Corn Porridge' },

  // Buah (standard)
  { category: 'buah', name_ms: 'Oren', name_en: 'Orange' },

  // Air
  { category: 'air', name_ms: 'Air Anggur / Kordial', name_en: 'Grape / Cordial Drink' },
  { category: 'air', name_ms: 'Teh O', name_en: 'Black Tea' },
  { category: 'air', name_ms: 'Kopi O', name_en: 'Black Coffee' },

  // Kuih
  { category: 'kuih', name_ms: 'Karipap', name_en: 'Curry Puff' },
  { category: 'kuih', name_ms: 'Kasui Gedik', name_en: 'Kasui Gedik' },
  { category: 'kuih', name_ms: 'Cara Lauk', name_en: 'Cara Lauk' },
  { category: 'kuih', name_ms: 'Cara Manis', name_en: 'Cara Manis' },
  { category: 'kuih', name_ms: 'Seri Muka', name_en: 'Seri Muka' },
  { category: 'kuih', name_ms: 'Kole Kacang', name_en: 'Kole Kacang' },
  { category: 'kuih', name_ms: 'Apam Gula Hangus', name_en: 'Burnt Sugar Apam' },
  { category: 'kuih', name_ms: 'Koci', name_en: 'Koci' },
]
