import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { INGREDIENT_RATIOS_SEED, MENU_OPTIONS_SEED } from '@/lib/seed-data'

// POST /api/seed — run once on first setup to populate lookup tables
// Protected by a simple seed key to prevent accidental re-runs
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== process.env.SEED_KEY && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors: string[] = []
  let seeded = 0

  // Seed ingredient_ratios
  for (const row of INGREDIENT_RATIOS_SEED) {
    const { error } = await supabaseAdmin
      .from('ingredient_ratios')
      .upsert(row, { onConflict: 'category,item_name' })

    if (error) {
      errors.push(`ingredient_ratios [${row.category}/${row.item_name}]: ${error.message}`)
    } else {
      seeded++
    }
  }

  // Seed menu_options — requires UNIQUE (category, name_ms) constraint on table
  for (const row of MENU_OPTIONS_SEED) {
    const { error } = await supabaseAdmin
      .from('menu_options')
      .upsert(row, { onConflict: 'category,name_ms' })

    if (error) {
      errors.push(`menu_options [${row.category}/${row.name_ms}]: ${error.message}`)
    } else {
      seeded++
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, seeded, errors }, { status: 207 })
  }

  return NextResponse.json({
    success: true,
    seeded,
    message: `Seeded ${seeded} records successfully`,
  })
}

// GET /api/seed — check seed status (count rows in each table)
export async function GET() {
  const [ingredientCount, menuCount] = await Promise.all([
    supabaseAdmin.from('ingredient_ratios').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('menu_options').select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    ingredient_ratios: ingredientCount.count ?? 0,
    menu_options: menuCount.count ?? 0,
    seeded: (ingredientCount.count ?? 0) > 0 && (menuCount.count ?? 0) > 0,
  })
}
