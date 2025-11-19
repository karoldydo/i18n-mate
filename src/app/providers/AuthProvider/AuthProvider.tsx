import type { User } from '@supabase/supabase-js';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useSupabase } from '../SupabaseProvider';

interface AuthContextValue {
  isLoading: boolean;
  resendVerification: (email?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  user: null | User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider - Global authentication state management
 *
 * Provides authentication state and methods throughout the application.
 * Syncs with Supabase Auth session via onAuthStateChange listener.
 *
 * Usage:
 * ```tsx
 * const { user, isLoading, signIn, signOut } = useAuth();
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = useSupabase();
  const [user, setUser] = useState<null | User>(null);
  const [isLoading, setIsLoading] = useState(true);

  // initialize session and listen for auth state changes
  useEffect(() => {
    // get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('[AuthProvider] Failed to get session:', error);
        setIsLoading(false);
      });

    // listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      // call Edge Function instead of direct auth.signUp() to enforce server-side validation
      // of registration_enabled config
      const { data, error } = await supabase.functions.invoke('signup', {
        body: { email, password },
      });

      // Edge Function returns custom error format: { error: { code, message, details? } }
      if (error) {
        // FunctionsHttpError from Edge Function
        throw new Error(error.message || 'Failed to create account');
      }

      // check for application-level errors in the response
      if (data?.error) {
        throw new Error(data.error.message || 'Failed to create account');
      }

      // immediately sign out to enforce "no session before verification" requirement
      // user must verify email and then login
      await supabase.auth.signOut();
      setUser(null);
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    },
    [supabase]
  );

  const resendVerification = useCallback(
    async (email?: string) => {
      // use provided email or fallback to user email
      const emailToUse = email || user?.email;

      if (!emailToUse) {
        throw new Error('No user email available for verification resend');
      }

      const { error } = await supabase.auth.resend({
        email: emailToUse,
        type: 'signup',
      });

      if (error) {
        throw error;
      }
    },
    [supabase, user?.email]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      resendVerification,
      resetPassword,
      signIn,
      signOut,
      signUp,
      updatePassword,
      user,
    }),
    [isLoading, resendVerification, resetPassword, signIn, signOut, signUp, updatePassword, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth - Access authentication context
 *
 * Must be used within AuthProvider.
 *
 * @throws Error if used outside AuthProvider
 */
function useAuthInternal(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAuthInternal as useAuth };
