'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/constants'
import { ProgramLevel } from '@/types/database'

export type ActionResponse = {
  error?: string
  success?: boolean
  message?: string
  traineeId?: string
}

/**
 * Helper to ensure the caller is an authenticated and active trainer.
 * Reads directly from the session and database, NEVER trusting client input.
 */
async function verifyActiveTrainer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Sesi login telah berakhir. Silakan login kembali.')
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, name, username, role, branch_id, is_active')
    .eq('id', user.id)
    .single()

  if (error || !profile || !profile.is_active || profile.role !== 'trainer') {
    throw new Error('Akses ditolak: Anda bukan Trainer aktif.')
  }

  if (profile.branch_id === null || profile.branch_id === undefined) {
    throw new Error('Trainer belum memiliki cabang penempatan.')
  }

  return profile
}

/**
 * 1. registerTrainee
 * - Creates user in auth.users via admin.auth.admin.createUser
 * - Inserts row into public.users with role='trainee', branch_id = trainer.branch_id, level
 * - Triggers rollback (deletes auth user) if insert fails
 * - Validates username (3-30 chars, lowercase, numbers, dots, underscores) and password (>= 8 chars)
 * - Database trigger automatically opens the first Term.
 */
export async function registerTraineeAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const trainer = await verifyActiveTrainer()

    const name = formData.get('name')?.toString().trim()
    const rawUsername = formData.get('username')?.toString().trim()
    const password = formData.get('password')?.toString()
    const level = formData.get('level')?.toString().trim() as ProgramLevel

    // Validation
    if (!name) {
      return { error: 'Nama lengkap wajib diisi.' }
    }

    if (!rawUsername) {
      return { error: 'Username wajib diisi.' }
    }

    const username = rawUsername.toLowerCase()
    const usernameRegex = /^[a-z0-9._]{3,30}$/
    if (!usernameRegex.test(username)) {
      return {
        error:
          'Username hanya boleh berisi huruf kecil, angka, titik, atau garis bawah (3-30 karakter).',
      }
    }

    if (!password || password.length < 8) {
      return { error: 'Kata sandi minimal 8 karakter.' }
    }

    if (level !== 'kinder' && level !== 'junior') {
      return { error: 'Level program harus Kinder atau Junior.' }
    }

    const adminClient = createAdminClient()

    // Check if username is already taken in public.users
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existingUser) {
      return { error: `Username "${username}" sudah digunakan. Pilih username lain.` }
    }

    const email = usernameToEmail(username)

    // Create user in Supabase Auth
    const { data: authCreated, error: authCreateError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          username,
          role: 'trainee',
        },
      })

    if (authCreateError || !authCreated.user) {
      console.error('Error creating auth user:', authCreateError)
      return {
        error: `Gagal membuat akun auth: ${authCreateError?.message || 'Terjadi kesalahan sistem'}`,
      }
    }

    const authUserId = authCreated.user.id

    // Insert into public.users
    const { error: insertUserError } = await adminClient.from('users').insert({
      id: authUserId,
      name,
      username,
      email,
      role: 'trainee',
      branch_id: trainer.branch_id,
      level,
      is_active: true,
    })

    if (insertUserError) {
      console.error('Error inserting user profile, rolling back auth user:', insertUserError)
      // Rollback: delete created auth user
      await adminClient.auth.admin.deleteUser(authUserId)
      return {
        error: `Gagal menyimpan data profil trainee: ${insertUserError.message}`,
      }
    }

    revalidatePath('/trainer')
    return {
      success: true,
      message: `Trainee ${name} (@${username}) berhasil didaftarkan!`,
      traineeId: authUserId,
    }
  } catch (error: unknown) {
    console.error('registerTraineeAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

/**
 * 2. resetTraineePassword
 * - Only for trainees within the same branch as the calling trainer
 * - Minimum 8 characters password validation
 */
export async function resetTraineePasswordAction(
  traineeId: string,
  newPassword: string
): Promise<ActionResponse> {
  try {
    const trainer = await verifyActiveTrainer()

    if (!newPassword || newPassword.length < 8) {
      return { error: 'Kata sandi baru minimal 8 karakter.' }
    }

    const adminClient = createAdminClient()

    // Verify trainee belongs to the trainer's branch
    const { data: trainee, error: traineeError } = await adminClient
      .from('users')
      .select('id, name, username, branch_id, role')
      .eq('id', traineeId)
      .single()

    if (traineeError || !trainee || trainee.role !== 'trainee') {
      return { error: 'Data trainee tidak ditemukan.' }
    }

    if (trainee.branch_id !== trainer.branch_id) {
      return { error: 'Anda hanya dapat mengatur password trainee di cabang Anda.' }
    }

    // Update password in Supabase Auth
    const { error: updateError } = await adminClient.auth.admin.updateUserById(traineeId, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Error updating password:', updateError)
      return { error: `Gagal mereset kata sandi: ${updateError.message}` }
    }

    revalidatePath(`/trainer/trainees/${traineeId}`)
    revalidatePath('/trainer')
    return {
      success: true,
      message: `Kata sandi untuk @${trainee.username} berhasil diperbarui.`,
    }
  } catch (error: unknown) {
    console.error('resetTraineePasswordAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

/**
 * 3. setTraineeActive
 * - Sets trainee is_active boolean (data is never deleted)
 * - Only for trainees in the calling trainer's branch
 */
export async function setTraineeActiveAction(
  traineeId: string,
  isActive: boolean
): Promise<ActionResponse> {
  try {
    const trainer = await verifyActiveTrainer()
    const adminClient = createAdminClient()

    // Verify trainee belongs to the trainer's branch
    const { data: trainee, error: traineeError } = await adminClient
      .from('users')
      .select('id, name, username, branch_id, role, is_active')
      .eq('id', traineeId)
      .single()

    if (traineeError || !trainee || trainee.role !== 'trainee') {
      return { error: 'Data trainee tidak ditemukan.' }
    }

    if (trainee.branch_id !== trainer.branch_id) {
      return { error: 'Anda hanya dapat mengubah status trainee di cabang Anda.' }
    }

    // Update is_active in public.users
    const { error: updateError } = await adminClient
      .from('users')
      .update({ is_active: isActive })
      .eq('id', traineeId)

    if (updateError) {
      console.error('Error updating trainee active state:', updateError)
      return { error: `Gagal memperbarui status aktif: ${updateError.message}` }
    }

    revalidatePath(`/trainer/trainees/${traineeId}`)
    revalidatePath('/trainer')
    return {
      success: true,
      message: `Status akun @${trainee.username} berhasil diubah menjadi ${
        isActive ? 'Aktif' : 'Nonaktif'
      }.`,
    }
  } catch (error: unknown) {
    console.error('setTraineeActiveAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}
