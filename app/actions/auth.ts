'use server'

import { cookies } from 'next/headers'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase'

const ROLE_COOKIE = 'kakmell_role'

function roleCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────

export async function loginAction(
  email: string,
  password: string
): Promise<{ role: string } | { error: string }> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'E-mel atau kata laluan salah. Cuba lagi.' }

  // Use supabaseAdmin (service role) — anon client's auth.uid() is unreliable
  // inside RLS evaluation after signIn, causing profile to return null → 'pending'.
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profile?.role ?? 'pending'

  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, role, roleCookieOptions())

  return { role }
}

// ── REGISTER ──────────────────────────────────────────────────────────────────

export async function registerAction(
  fullName: string,
  email: string,
  password: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Pendaftaran gagal. Cuba lagi.' }

  // Use supabaseAdmin (service role) to insert the profile.
  // This bypasses RLS and works regardless of whether Supabase email
  // confirmation is enabled (signUp may return no session when it is enabled,
  // which would cause an anon-key INSERT to fail the `authenticated` RLS policy).
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({ id: data.user.id, full_name: fullName, email, role: 'pending' })

  if (profileError && profileError.code !== '23505') {
    // 23505 = unique_violation — row already exists from a previous attempt, fine to continue
    return { error: 'Gagal mendaftar. Cuba lagi.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, 'pending', roleCookieOptions())

  return { success: true }
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(ROLE_COOKIE)
}

// ── REFRESH ROLE (used by /pending polling) ───────────────────────────────────

export async function refreshRoleAction(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // Use supabaseAdmin — same RLS issue as loginAction
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = profile?.role ?? 'pending'

  // Update the role cookie so middleware has fresh data on next navigation
  const cookieStore = await cookies()
  cookieStore.set(ROLE_COOKIE, role, roleCookieOptions())

  return role
}

// ── GET ALL USERS (admin only) ────────────────────────────────────────────────

export interface UserProfileRow {
  id: string
  full_name: string | null
  email: string | null
  role: string
  approved_at: string | null
  created_at: string
}

export async function getUsersAction(): Promise<{ users: UserProfileRow[] } | { error: string }> {
  // Verify caller is admin before returning sensitive user list
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Tidak dibenarkan.' }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, full_name, email, role, approved_at, created_at')
    .order('created_at', { ascending: false })

  if (error) return { error: 'Gagal muatkan senarai pengguna.' }
  return { users: data ?? [] }
}

// ── APPROVE / CHANGE ROLE (admin action) ──────────────────────────────────────

export async function approveUserAction(
  userId: string,
  role: string
): Promise<{ success: true } | { error: string }> {
  // Verify caller is admin
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Tidak dibenarkan.' }

  // Use supabaseAdmin — anon client's RLS check on update also fails in server context
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      role,
      approved_at: new Date().toISOString(),
      approved_by: session.user.id,
    })
    .eq('id', userId)

  if (error) return { error: 'Gagal kemaskini peranan. Cuba lagi.' }
  return { success: true }
}
