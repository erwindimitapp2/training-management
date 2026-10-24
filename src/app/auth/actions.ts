'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/constants'

export type AuthState = {
  error?: string
  success?: boolean
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawUsername = formData.get('username')?.toString().trim()
  const password = formData.get('password')?.toString()

  if (!rawUsername || !password) {
    return { error: 'Username dan kata sandi wajib diisi.' }
  }

  const username = rawUsername.toLowerCase()

  try {
    let emailToAuth: string = usernameToEmail(username)

    // Lookup public.users by username to find the registered email
    // Use admin client if available to bypass RLS for pre-auth lookup
    try {
      const adminClient = createAdminClient()
      const { data: userProfile, error: profileLookupError } = await adminClient
        .from('users')
        .select('id, email, username, is_active, role')
        .eq('username', username)
        .maybeSingle()

      if (profileLookupError) {
        console.error('Profile lookup error:', profileLookupError)
      } else if (userProfile) {
        if (!userProfile.is_active) {
          return {
            error: 'Akun Anda berstatus nonaktif. Silakan hubungi Trainer Anda.',
          }
        }
        if (userProfile.email) {
          emailToAuth = userProfile.email
        }
      } else {
        // Username is not found in public.users
        return {
          error: `Username "${username}" tidak ditemukan di sistem. Pastikan ejaan benar.`,
        }
      }
    } catch (adminErr) {
      console.warn('Admin client lookup bypassed, falling back to derived email:', adminErr)
    }

    // Authenticate with Supabase Auth using the resolved email and submitted password
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    })

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      // Provide exact diagnostic message in Indonesian
      if (authError?.message?.includes('Invalid login credentials')) {
        return {
          error: 'Kata sandi yang Anda masukkan salah. Periksa kembali huruf besar/kecil.',
        }
      }
      return {
        error: authError?.message
          ? `Gagal masuk: ${authError.message}`
          : 'Username atau kata sandi tidak valid. Pastikan data yang dimasukkan benar.',
      }
    }

    // Verify profile and role mapping for the authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, is_active, name')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error after auth:', profileError)
      await supabase.auth.signOut()
      return {
        error: 'Profil pengguna tidak ditemukan di tabel users. Hubungi administrator.',
      }
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      return {
        error: 'Akun Anda berstatus nonaktif. Silakan hubungi Trainer Anda.',
      }
    }

    if (profile.role === 'trainer') {
      redirect('/trainer')
    } else {
      redirect('/dashboard')
    }
  } catch (error: unknown) {
    // If it's a redirect, re-throw it because Next.js handles redirects by throwing NEXT_REDIRECT
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest: unknown }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }

    console.error('Login action error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return {
      error: `Kendala server: ${errMessage}`,
    }
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
  redirect('/login')
}
