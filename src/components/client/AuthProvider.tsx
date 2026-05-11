'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: any | null
  isAdmin: boolean
  isModerator: boolean
  permissions: string[]
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModerator, setIsModerator] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string, currentUser?: User | null) => {
    if (!profile) setIsLoading(true)
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      }

      // If no profile exists, try to initialize one
      if (!profileData && currentUser) {
        const meta = currentUser.user_metadata || {}
        const { error: initError } = await supabase.rpc('initialize_my_account', {
          _name: meta.full_name || meta.name || 'New User',
          _email: currentUser.email || '',
          _phone: meta.phone_number || '',
          _username: meta.username || '',
          _gender: meta.gender || '',
          _avatar_url: '',
          _referred_by_code: meta.referral_code_used || null,
          _country: meta.country || 'Nigeria',
          _country_code: meta.country_code || '+234',
          _is_global: meta.is_global || false,
        })

        if (!initError) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          if (newProfile) setProfile(newProfile)
        } else {
          console.error('Account initialization failed:', initError)
        }
      } else if (profileData) {
        setProfile(profileData)
      }

      // Check admin / moderator role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, permissions')
        .eq('user_id', userId)
        .in('role', ['admin', 'moderator'])
        .maybeSingle()

      setIsAdmin(roleData?.role === 'admin')
      setIsModerator(roleData?.role === 'moderator')

      let parsedPerms: string[] = []
      if (roleData?.permissions) {
        if (Array.isArray(roleData.permissions)) {
          parsedPerms = roleData.permissions
        } else if (typeof roleData.permissions === 'string') {
          try { parsedPerms = JSON.parse(roleData.permissions) } catch {}
        }
      }
      setPermissions(parsedPerms)
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          fetchProfile(session.user.id, session.user)
        }
      } else {
        setProfile(null)
        setIsAdmin(false)
        setIsModerator(false)
        setPermissions([])
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = useCallback(() => {
    if (user?.id) fetchProfile(user.id, user)
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return (
    <AuthContext.Provider value={{
      session, user, profile, isAdmin, isModerator, permissions, isLoading, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
