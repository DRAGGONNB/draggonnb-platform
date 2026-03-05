'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const organizationName = formData.get('organization_name') as string
  const fullName = formData.get('full_name') as string

  // Create user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  // Create organization and user records using admin client to bypass RLS
  if (authData.user) {
    let admin: ReturnType<typeof createAdminClient>
    try {
      admin = createAdminClient()
    } catch {
      // Fall back to user client if admin unavailable
      admin = supabase as ReturnType<typeof createAdminClient>
    }

    const { data: orgData, error: orgError } = await admin.from('organizations').insert({
      name: organizationName,
      subscription_tier: 'starter',
      subscription_status: 'trial',
      owner_id: authData.user.id,
      created_at: new Date().toISOString(),
    }).select('id').single()

    if (orgError || !orgData) {
      console.error('Organization creation error:', orgError)
      return { error: 'Account created but organization setup failed. Please contact support.' }
    }

    // Create user record in users table with organization link
    const { error: userError } = await admin.from('users').insert({
      id: authData.user.id,
      email: data.email,
      full_name: fullName,
      organization_id: orgData.id,
      role: 'admin',
      created_at: new Date().toISOString(),
    })

    if (userError) {
      console.error('User record creation error:', userError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password reset email sent. Please check your inbox.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
