import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null; // Database profile
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id, session.user);
        setIsLoading(false); // <--- Instantly unlocks app routing regardless of Profile fetch time
      });
  
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setIsLoading(false); // <--- Instantly unlocks during Auth transitions
      });
  
      return () => subscription.unsubscribe();
    }, []);
  
    const fetchProfile = async (userId: string, currentUser?: User | null) => {
      try {
        let [profileResult, roleResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).single(),
          supabase.from('user_roles').select('*').eq('user_id', userId).eq('role', 'admin').maybeSingle()
        ]);
        
        // If profile was not found automatically by trigger, attempt to run initialization
        if (profileResult.error && currentUser) {
          console.log("Profile not found. Attempting initialization...");
          const metadata = currentUser.user_metadata || {};
          const { error: initError } = await supabase.rpc('initialize_my_account', {
            _name: metadata.full_name || 'New User',
            _email: currentUser.email || '',
            _phone: metadata.phone_number || '',
            _username: metadata.username || '',
            _gender: metadata.gender || '',
            _avatar_url: '',
            _referred_by_code: metadata.referral_code_used || null
          });
  
          if (!initError) {
             profileResult = await supabase.from('profiles').select('*').eq('user_id', userId).single();
          } else {
             console.error("Account initialization failed:", initError);
          }
        }
  
        if (!profileResult.error && profileResult.data) {
          setProfile(profileResult.data);
        }
        setIsAdmin(!!roleResult.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
