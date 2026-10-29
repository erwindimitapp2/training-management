'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToEmail } from '@/lib/constants'
import { ProgramLevel, TermStatus } from '@/types/database'

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

  return profile
}

/**
 * 1. registerTrainee
 * - Creates user in auth.users via admin.auth.admin.createUser
 * - Inserts row into public.users with role='trainee', branch_id from form, level
 * - Triggers rollback (deletes auth user) if insert fails
 * - Validates username (3-30 chars, lowercase, numbers, dots, underscores) and password (>= 8 chars)
 * - Database trigger automatically opens the first Term.
 */
export async function registerTraineeAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    await verifyActiveTrainer()

    const name = formData.get('name')?.toString().trim()
    const rawUsername = formData.get('username')?.toString().trim()
    const password = formData.get('password')?.toString()
    const rawBranchId = formData.get('branchId')?.toString()
    const branchId = rawBranchId ? parseInt(rawBranchId, 10) : NaN

    // Validation
    if (!name) {
      return { error: 'Nama lengkap wajib diisi.' }
    }

    if (!rawUsername) {
      return { error: 'Username wajib diisi.' }
    }

    if (isNaN(branchId)) {
      return { error: 'Cabang wajib dipilih.' }
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

    const adminClient = createAdminClient()

    // Validate that branchId exists in branches
    const { data: branchData, error: branchError } = await adminClient
      .from('branches')
      .select('id, name')
      .eq('id', branchId)
      .maybeSingle()

    if (branchError || !branchData) {
      return { error: 'Cabang yang dipilih tidak valid.' }
    }

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

    // Insert into public.users (level is null because trainee has access to all terms/levels)
    const { error: insertUserError } = await adminClient.from('users').insert({
      id: authUserId,
      name,
      username,
      email,
      role: 'trainee',
      branch_id: branchId,
      level: null,
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

    // Step 2: Assign terms if selected (trainer session client, auth.uid())
    const rawTermIds = formData.getAll('termIds')
    const termIds = rawTermIds
      .map((t) => parseInt(t.toString(), 10))
      .filter((n) => !isNaN(n))

    if (termIds.length > 0) {
      try {
        const supabase = await createClient()
        const { data: addedCount, error: assignError } = await supabase.rpc('assign_terms', {
          p_trainee_id: authUserId,
          p_term_ids: termIds,
        })

        if (assignError) {
          console.error('assign_terms RPC error during registration:', assignError)
          revalidatePath('/trainer')
          return {
            success: true,
            message:
              'Akun berhasil dibuat, tetapi assign term gagal. Silakan assign dari tombol Assign Term.',
            traineeId: authUserId,
          }
        }

        revalidatePath('/trainer')
        return {
          success: true,
          message: `Trainee ${name} (@${username}) berhasil didaftarkan di cabang ${branchData.name} dengan ${addedCount ?? termIds.length} term di-assign!`,
          traineeId: authUserId,
        }
      } catch (assignCatchErr) {
        console.error('Exception during assign_terms in registration:', assignCatchErr)
        revalidatePath('/trainer')
        return {
          success: true,
          message:
            'Akun berhasil dibuat, tetapi assign term gagal. Silakan assign dari tombol Assign Term.',
          traineeId: authUserId,
        }
      }
    }

    revalidatePath('/trainer')
    return {
      success: true,
      message: `Trainee ${name} (@${username}) berhasil didaftarkan di cabang ${branchData.name}! Belum ada term yang di-assign.`,
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
 * - Caller must be an active trainer
 * - Target must have role='trainee'
 * - Minimum 8 characters password validation
 */
export async function resetTraineePasswordAction(
  traineeId: string,
  newPassword: string
): Promise<ActionResponse> {
  try {
    await verifyActiveTrainer()

    if (!newPassword || newPassword.length < 8) {
      return { error: 'Kata sandi baru minimal 8 karakter.' }
    }

    const adminClient = createAdminClient()

    // Verify target is trainee
    const { data: trainee, error: traineeError } = await adminClient
      .from('users')
      .select('id, name, username, branch_id, role')
      .eq('id', traineeId)
      .single()

    if (traineeError || !trainee || trainee.role !== 'trainee') {
      return { error: 'Data trainee tidak ditemukan.' }
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
 * - Caller must be an active trainer
 * - Target must have role='trainee'
 */
export async function setTraineeActiveAction(
  traineeId: string,
  isActive: boolean
): Promise<ActionResponse> {
  try {
    await verifyActiveTrainer()
    const adminClient = createAdminClient()

    // Verify target is trainee
    const { data: trainee, error: traineeError } = await adminClient
      .from('users')
      .select('id, name, username, branch_id, role, is_active')
      .eq('id', traineeId)
      .single()

    if (traineeError || !trainee || trainee.role !== 'trainee') {
      return { error: 'Data trainee tidak ditemukan.' }
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

/**
 * 3b. changeTraineeBranchAction
 * - Moves a trainee to a new branch
 * - Caller must be an active trainer
 * - Target must have role='trainee'
 * - Validates branchId against public.branches
 */
export async function changeTraineeBranchAction(
  traineeId: string,
  branchId: number
): Promise<ActionResponse> {
  try {
    await verifyActiveTrainer()

    if (!traineeId) {
      return { error: 'ID Trainee tidak valid.' }
    }

    if (!branchId || isNaN(branchId)) {
      return { error: 'Pilih cabang tujuan yang valid.' }
    }

    const adminClient = createAdminClient()

    // Verify target is trainee
    const { data: trainee, error: traineeError } = await adminClient
      .from('users')
      .select('id, name, username, role, branch_id')
      .eq('id', traineeId)
      .single()

    if (traineeError || !trainee || trainee.role !== 'trainee') {
      return { error: 'Data trainee tidak ditemukan.' }
    }

    // Verify branch exists
    const { data: branch, error: branchError } = await adminClient
      .from('branches')
      .select('id, name')
      .eq('id', branchId)
      .maybeSingle()

    if (branchError || !branch) {
      return { error: 'Cabang yang dipilih tidak terdaftar.' }
    }

    if (trainee.branch_id === branchId) {
      return { error: `Trainee sudah berada di cabang ${branch.name}.` }
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update({ branch_id: branchId })
      .eq('id', traineeId)

    if (updateError) {
      console.error('Error changing trainee branch:', updateError)
      return { error: `Gagal memindahkan cabang trainee: ${updateError.message}` }
    }

    revalidatePath('/trainer')
    revalidatePath(`/trainer/trainees/${traineeId}`)

    return {
      success: true,
      message: `Cabang @${trainee.username} (${trainee.name}) berhasil dipindahkan ke ${branch.name}.`,
    }
  } catch (error: unknown) {
    console.error('changeTraineeBranchAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

export type TermStatusAction = 'start_check' | 'need_review' | 'ready_for_trial'

/**
 * 4. changeTermStatusAction
 * - Verifies active trainer and authorization
 * - Validates required note on need_review
 * - Calls change_term_status RPC (which also fires triggers like trg_open_next_term)
 * - Revalidates trainer dashboard, trainee detail page, and trainee dashboard
 */
export async function changeTermStatusAction(
  traineeTermId: number,
  action: TermStatusAction,
  traineeId: string,
  note?: string
): Promise<ActionResponse> {
  try {
    const trainer = await verifyActiveTrainer()

    if (action === 'need_review') {
      const trimmedNote = note?.trim()
      if (!trimmedNote || trimmedNote.length === 0) {
        return { error: 'Catatan evaluasi wajib diisi untuk tindakan Need Review.' }
      }
    }

    const supabase = await createClient()

    const { error } = await supabase.rpc('change_term_status', {
      p_trainee_term_id: traineeTermId,
      p_action: action,
      p_note: note?.trim() || undefined,
    })

    if (error) {
      console.error('change_term_status RPC error:', error)
      return { error: error.message || 'Gagal mengubah status term.' }
    }

    revalidatePath('/trainer')
    revalidatePath(`/trainer/trainees/${traineeId}`)
    revalidatePath('/dashboard')

    let msg = 'Status term berhasil diperbarui.'
    if (action === 'start_check') {
      msg = 'Sesi Understanding Check berhasil dimulai!'
    } else if (action === 'need_review') {
      msg = 'Catatan Need Review berhasil dikirim. Term dikembalikan ke In Self-Training.'
    } else if (action === 'ready_for_trial') {
      msg = 'Term disetujui Ready for Trial Class!'
    }

    return {
      success: true,
      message: msg,
    }
  } catch (error: unknown) {
    console.error('changeTermStatusAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

export type ObservationInput = {
  traineeId: string
  termId: number
  sessionDate: string
  scorePreparation: number
  scoreDelivery: number
  scoreMastery: number
  scoreVisual: number
  scoreEngagement: number
  result: 'pass' | 'retry'
  notes?: string
}

/**
 * 5. recordObservationAction
 * - Verifies active trainer and authorization
 * - Validates scores 1-5 for the 5 observation criteria
 * - Validates result ('pass' | 'retry') and date format
 * - Calls record_observation RPC (which automatically marks cleared_to_teach = true when result is 'pass')
 * - Revalidates trainer dashboard, trainee detail page, and trainee views
 */
export async function recordObservationAction(
  input: ObservationInput
): Promise<ActionResponse> {
  try {
    const trainer = await verifyActiveTrainer()

    const {
      traineeId,
      termId,
      sessionDate,
      scorePreparation,
      scoreDelivery,
      scoreMastery,
      scoreVisual,
      scoreEngagement,
      result,
      notes,
    } = input

    if (!traineeId) {
      return { error: 'ID Trainee tidak valid.' }
    }

    if (!termId || isNaN(termId)) {
      return { error: 'ID Term tidak valid.' }
    }

    if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      return { error: 'Tanggal observasi harus dalam format YYYY-MM-DD.' }
    }

    const scores = [
      { name: 'Persiapan Mengajar', val: scorePreparation },
      { name: 'Penyampaian Materi', val: scoreDelivery },
      { name: 'Penguasaan Materi', val: scoreMastery },
      { name: 'Penggunaan Visual', val: scoreVisual },
      { name: 'Interaksi & Engagement', val: scoreEngagement },
    ]

    for (const s of scores) {
      if (
        typeof s.val !== 'number' ||
        isNaN(s.val) ||
        s.val < 1 ||
        s.val > 5 ||
        !Number.isInteger(s.val)
      ) {
        return { error: `Skor ${s.name} harus berupa angka bulat antara 1 hingga 5.` }
      }
    }

    if (result !== 'pass' && result !== 'retry') {
      return { error: 'Hasil observasi harus Lulus (pass) atau Ulang (retry).' }
    }

    const supabase = await createClient()

    const { error } = await supabase.rpc('record_observation', {
      p_trainee_id: traineeId,
      p_term_id: termId,
      p_session_date: sessionDate,
      p_preparation: scorePreparation,
      p_delivery: scoreDelivery,
      p_mastery: scoreMastery,
      p_visual: scoreVisual,
      p_engagement: scoreEngagement,
      p_result: result,
      p_notes: notes?.trim() || undefined,
    })

    if (error) {
      console.error('record_observation RPC error:', error)
      return { error: error.message || 'Gagal menyimpan hasil sesi observasi.' }
    }

    revalidatePath('/trainer')
    revalidatePath(`/trainer/trainees/${traineeId}`)
    revalidatePath('/dashboard')
    revalidatePath(`/term/${termId}`)

    return {
      success: true,
      message:
        result === 'pass'
          ? 'Hasil observasi disimpan: Trainee dinyatakan Lulus (Pass) dan meraih predikat Layak Mengajar!'
          : 'Hasil observasi disimpan: Trainee dijadwalkan untuk observasi ulang (Retry).',
    }
  } catch (error: unknown) {
    console.error('recordObservationAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

export type AssignedTermInfo = {
  id: number // trainee_terms.id
  termId: number
  name: string
  level: ProgramLevel
  sortOrder: number
  status: TermStatus
  clearedToTeach: boolean
  hasProgress: boolean
}

/**
 * 6. getTraineeAssignedTermsAction
 * Fetch assigned terms and check whether each term has progress.
 * Used by the Assign Term modal.
 */
export async function getTraineeAssignedTermsAction(
  traineeId: string
): Promise<{ error?: string; assignedTerms?: AssignedTermInfo[] }> {
  try {
    await verifyActiveTrainer()

    if (!traineeId) {
      return { error: 'ID Trainee tidak valid.' }
    }

    const supabase = await createClient()

    // 1. Fetch trainee_terms
    const { data: ttData, error: ttError } = await supabase
      .from('trainee_terms')
      .select('id, term_id, status, cleared_to_teach, terms(id, name, level, sort_order)')
      .eq('trainee_id', traineeId)

    if (ttError) {
      console.error('Error fetching trainee_terms for assign modal:', ttError)
      return { error: 'Gagal mengambil data term trainee.' }
    }

    if (!ttData || ttData.length === 0) {
      return { assignedTerms: [] }
    }

    const traineeTermIds = ttData.map((tt) => tt.id)

    // 2. Fetch studied lessons for this trainee
    const { data: studiedLessonsData } = await supabase
      .from('trainee_lessons')
      .select('lesson_id, studied, lessons(term_id)')
      .eq('trainee_id', traineeId)
      .eq('studied', true)

    const studiedTermIdSet = new Set(
      (studiedLessonsData || [])
        .map((l) => (l.lessons as unknown as { term_id: number } | null)?.term_id)
        .filter((id): id is number => typeof id === 'number')
    )

    // 3. Fetch status history with from_status not null
    const { data: historyData } = await supabase
      .from('status_history')
      .select('id, trainee_term_id, from_status')
      .in('trainee_term_id', traineeTermIds)
      .not('from_status', 'is', null)

    const historyTtIdSet = new Set((historyData || []).map((h) => h.trainee_term_id))

    // 4. Map to AssignedTermInfo
    const assignedTerms: AssignedTermInfo[] = ttData.map((tt) => {
      const termObj = tt.terms as unknown as {
        id: number
        name: string
        level: ProgramLevel
        sort_order: number
      } | null

      const hasStudied = studiedTermIdSet.has(tt.term_id)
      const hasHistory = historyTtIdSet.has(tt.id)
      const hasProgress =
        tt.cleared_to_teach ||
        tt.status !== 'in_self_training' ||
        hasStudied ||
        hasHistory

      return {
        id: tt.id,
        termId: tt.term_id,
        name: termObj?.name || `Term ${tt.term_id}`,
        level: termObj?.level || 'kinder',
        sortOrder: termObj?.sort_order || 0,
        status: tt.status,
        clearedToTeach: tt.cleared_to_teach,
        hasProgress,
      }
    })

    return { assignedTerms }
  } catch (error: unknown) {
    console.error('getTraineeAssignedTermsAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}

/**
 * 7. saveTermAssignmentsAction
 * Save term assignments diff:
 * - Newly checked terms -> assign_terms (single call)
 * - Unchecked terms -> unassign_term (per term)
 */
export async function saveTermAssignmentsAction({
  traineeId,
  toAssignTermIds,
  toUnassignTraineeTermIds,
}: {
  traineeId: string
  toAssignTermIds: number[]
  toUnassignTraineeTermIds: number[]
}): Promise<ActionResponse & { addedCount?: number; unassignedCount?: number }> {
  try {
    await verifyActiveTrainer()

    if (!traineeId) {
      return { error: 'ID Trainee tidak valid.' }
    }

    const supabase = await createClient()

    let addedCount = 0
    let unassignedCount = 0

    // 1. Assign new terms (one call)
    if (toAssignTermIds.length > 0) {
      const { data, error: assignError } = await supabase.rpc('assign_terms', {
        p_trainee_id: traineeId,
        p_term_ids: toAssignTermIds,
      })

      if (assignError) {
        console.error('assign_terms error:', assignError)
        return { error: assignError.message || 'Gagal menambahkan term.' }
      }

      addedCount = typeof data === 'number' ? data : toAssignTermIds.length
    }

    // 2. Unassign terms (one by one per RPC signature)
    if (toUnassignTraineeTermIds.length > 0) {
      for (const ttId of toUnassignTraineeTermIds) {
        const { error: unassignError } = await supabase.rpc('unassign_term', {
          p_trainee_term_id: ttId,
        })

        if (unassignError) {
          console.error('unassign_term error:', unassignError)
          // Display the exact Indonesian error message returned from database
          return { error: unassignError.message || 'Gagal mencabut term.' }
        }

        unassignedCount++
      }
    }

    revalidatePath('/trainer')
    revalidatePath(`/trainer/trainees/${traineeId}`)
    revalidatePath('/dashboard')

    let message = ''
    if (addedCount > 0 && unassignedCount > 0) {
      message = `${addedCount} term ditambahkan, ${unassignedCount} dicabut`
    } else if (addedCount > 0) {
      message = `${addedCount} term berhasil ditambahkan`
    } else if (unassignedCount > 0) {
      message = `${unassignedCount} term berhasil dicabut`
    } else {
      message = 'Tidak ada perubahan term yang disimpan.'
    }

    return {
      success: true,
      message,
      addedCount,
      unassignedCount,
    }
  } catch (error: unknown) {
    console.error('saveTermAssignmentsAction error:', error)
    const errMessage = error instanceof Error ? error.message : String(error)
    return { error: errMessage }
  }
}
