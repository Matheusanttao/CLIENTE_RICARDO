import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured } from '@/lib/env'
import { getSupabase } from '@/lib/supabase/client'
import { clearTemporaryFlag, temporarySessionExpired } from '@/lib/auth/remember'
import type { MemberRole, Tables } from '@/types/database'

export type AuthMembership = Tables<'organization_members'> & {
  organizations: Pick<Tables<'organizations'>, 'id' | 'name' | 'slug' | 'slogan'> | null
}

export type StudentLink = Pick<
  Tables<'students'>,
  'id' | 'organization_id' | 'full_name' | 'status' | 'user_id'
>

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: Tables<'profiles'> | null
  memberships: AuthMembership[]
  studentLinks: StudentLink[]
  staffMembership: AuthMembership | null
  activeStudent: StudentLink | null
  isStaff: boolean
  isStudent: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  hasRole: (roles: MemberRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadContext(userId: string) {
  const sb = getSupabase()
  if (!sb) return { profile: null, memberships: [] as AuthMembership[], studentLinks: [] as StudentLink[] }

  const [profileRes, membersRes, studentsRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb
      .from('organization_members')
      .select('*, organizations(id, name, slug, slogan)')
      .eq('user_id', userId)
      .eq('status', 'active'),
    sb.from('students').select('id, organization_id, full_name, status, user_id').eq('user_id', userId),
  ])

  return {
    profile: profileRes.data,
    memberships: (membersRes.data || []) as AuthMembership[],
    studentLinks: (studentsRes.data || []) as StudentLink[],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [memberships, setMemberships] = useState<AuthMembership[]>([])
  const [studentLinks, setStudentLinks] = useState<StudentLink[]>([])

  const hydrate = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession?.user) {
      setProfile(null)
      setMemberships([])
      setStudentLinks([])
      return
    }
    const data = await loadContext(nextSession.user.id)
    setProfile(data.profile)
    setMemberships(data.memberships)
    setStudentLinks(data.studentLinks)
  }, [])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setLoading(false)
      return
    }

    let mounted = true
    const start = temporarySessionExpired()
      ? sb.auth.signOut({ scope: 'local' }).then(() => clearTemporaryFlag())
      : Promise.resolve()
    start.then(() => sb.auth.getSession()).then(({ data }) => {
      if (!mounted) return
      hydrate(data.session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      hydrate(next).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [hydrate])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    const data = await loadContext(session.user.id)
    setProfile(data.profile)
    setMemberships(data.memberships)
    setStudentLinks(data.studentLinks)
  }, [session?.user])

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    queryClient.clear()
    setSession(null)
    setProfile(null)
    setMemberships([])
    setStudentLinks([])
  }, [queryClient])

  const staffMembership =
    memberships.find((m) => ['owner', 'admin', 'coach'].includes(m.role)) || null
  const activeStudent = studentLinks.find((s) => s.status === 'active') || null

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      memberships,
      studentLinks,
      staffMembership,
      activeStudent,
      isStaff: Boolean(staffMembership),
      isStudent: Boolean(activeStudent),
      refreshProfile,
      signOut,
      hasRole: (roles) => memberships.some((m) => roles.includes(m.role)),
    }),
    [
      loading,
      session,
      profile,
      memberships,
      studentLinks,
      staffMembership,
      activeStudent,
      refreshProfile,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
