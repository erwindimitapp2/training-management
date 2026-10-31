'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Verify caller is an active trainee
 */
async function verifyActiveTrainee() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Sesi login telah berakhir. Silakan login kembali.')
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, name, username, role, is_active, level, branch_id')
    .eq('id', user.id)
    .single()

  if (error || !profile || !profile.is_active || profile.role !== 'trainee') {
    throw new Error('Akses ditolak: Hanya trainee aktif yang dapat melakukan aksi ini.')
  }

  return { supabase, user, profile }
}

/**
 * Toggle lesson studied state for a trainee
 * - Upserts into trainee_lessons
 * - RLS policy ensures trainee can only modify if term status is 'in_self_training'
 */
export async function toggleLessonAction(
  termId: number,
  lessonId: number,
  studied: boolean
): Promise<ActionResult> {
  try {
    const { supabase, user } = await verifyActiveTrainee()

    const studiedAt = studied ? new Date().toISOString() : null

    const { error } = await supabase.from('trainee_lessons').upsert(
      {
        trainee_id: user.id,
        lesson_id: lessonId,
        studied,
        studied_at: studiedAt,
      },
      {
        onConflict: 'trainee_id, lesson_id',
        defaultToNull: false,
      }
    )

    if (error) {
      console.error('Error toggling lesson studied:', error)
      if (error.message.includes('violates row-level security policy') || error.code === '42501') {
        return {
          error:
            'Lesson tidak dapat diubah karena status Term saat ini bukan In Self-Training.',
        }
      }
      return { error: `Gagal memperbarui status lesson: ${error.message}` }
    }

    revalidatePath(`/term/${termId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: unknown) {
    console.error('toggleLessonAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

/**
 * Update lesson evidence URL for a trainee
 * - Upserts into trainee_lessons without modifying studied or studied_at
 * - Empty string or null removes the link
 * - Validates url: starts with http:// or https://, no spaces, max 500 chars
 * - RLS policy ensures trainee can only modify if term status is 'in_self_training'
 */
export async function updateLessonEvidenceAction(
  termId: number,
  lessonId: number,
  evidenceUrl: string | null
): Promise<ActionResult> {
  try {
    const { supabase, user } = await verifyActiveTrainee()

    const cleanUrl = evidenceUrl && evidenceUrl.trim().length > 0 ? evidenceUrl.trim() : null

    // Validation
    if (cleanUrl) {
      if (/\s/.test(cleanUrl)) {
        return { error: 'Link bukti tidak boleh mengandung spasi.' }
      }
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return { error: 'Link bukti harus diawali dengan http:// atau https://' }
      }
      if (cleanUrl.length > 500) {
        return { error: 'Link bukti maksimal 500 karakter.' }
      }
      if (!/^https?:\/\/[^\s]+$/i.test(cleanUrl)) {
        return { error: 'Format link bukti tidak valid.' }
      }
    }

    const { error } = await supabase.from('trainee_lessons').upsert(
      {
        trainee_id: user.id,
        lesson_id: lessonId,
        evidence_url: cleanUrl,
      },
      {
        onConflict: 'trainee_id, lesson_id',
        defaultToNull: false,
      }
    )

    if (error) {
      console.error('Error updating lesson evidence URL:', error)
      if (error.message.includes('violates row-level security policy') || error.code === '42501') {
        return {
          error:
            'Link bukti tidak dapat diubah karena status Term saat ini bukan In Self-Training.',
        }
      }
      if (error.message.includes('evidence_url_valid')) {
        return {
          error:
            'Format link bukti tidak valid. Pastikan diawali http:// atau https://, tanpa spasi, dan maksimal 500 karakter.',
        }
      }
      return { error: `Gagal menyimpan link bukti: ${error.message}` }
    }

    revalidatePath(`/term/${termId}`)
    return { success: true, message: cleanUrl ? 'Tersimpan' : 'Link bukti dihapus' }
  } catch (error: unknown) {
    console.error('updateLessonEvidenceAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

/**
 * Submit Ready for Check
 * - Uses the change_term_status RPC function
 * - Requires all 10 lessons in the term to be studied
 * - Changes status from 'in_self_training' to 'ready_for_check'
 */
export async function submitReadyForCheckAction(
  traineeTermId: number,
  termId: number
): Promise<ActionResult> {
  try {
    const { supabase } = await verifyActiveTrainee()

    const { error } = await supabase.rpc('change_term_status', {
      p_trainee_term_id: traineeTermId,
      p_action: 'ready_for_check',
    })

    if (error) {
      console.error('change_term_status error:', error)
      return {
        error: error.message || 'Gagal mengubah status menjadi Ready for Check.',
      }
    }

    revalidatePath(`/term/${termId}`)
    revalidatePath('/dashboard')
    revalidatePath('/trainer')

    return {
      success: true,
      message:
        'Status berhasil diubah menjadi Ready for Check! Trainer Anda akan segera memeriksa pemahaman Anda.',
    }
  } catch (error: unknown) {
    console.error('submitReadyForCheckAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}
