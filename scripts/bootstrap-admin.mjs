/**
 * Bootstrap do primeiro owner — usa SERVICE ROLE (somente servidor/local).
 * Uso: node scripts/bootstrap-admin.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const fullName = process.env.ADMIN_NAME || 'Ricardo Neves'
const orgId = 'a0000000-0000-4000-8000-000000000001'

if (!url || !serviceKey || !email || !password) {
  console.error(
    'Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL e ADMIN_PASSWORD.',
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
})

let userId = created?.user?.id

if (createError) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) {
    console.error(createError.message)
    process.exit(1)
  }
  userId = existing.id
  console.log('Usuário já existia; vinculando membership…')
}

const { error: memberError } = await admin.from('organization_members').upsert(
  {
    organization_id: orgId,
    user_id: userId,
    role: 'owner',
    status: 'active',
  },
  { onConflict: 'organization_id,user_id' },
)

if (memberError) {
  console.error(memberError.message)
  process.exit(1)
}

await admin.from('profiles').update({ full_name: fullName }).eq('id', userId)

console.log('Admin vinculado com sucesso:', email, userId)
