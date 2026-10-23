'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { usernameToEmail } from '@/lib/constants'

export type AuthState = {
  error?: string
  success?: boolean
}

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const username = formData.get('username')?.toString().trim()
  const password = formData.get('password')?.toString()

  if (!username || !password) {
    return { error: 'Username dan kata sandi wajib diisi.' }
  }

  const email = usernameToEmail(username)

  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      console.error('Supabase auth error:', authError)
      return {
        error: 'Username atau kata sandi tidak valid. Pastikan data yang dimasukkan benar.',
      }
    }

    // Check active status in users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, is_active, name')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      return {
        error: 'Profil pengguna tidak ditemukan di sistem. Hubungi administrator.',
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
    return {
      error:
        'Terjadi kendala saat menghubungkan ke database server. Pastikan konfigurasi Supabase di Vercel sudah benar.',
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
