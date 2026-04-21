import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { User } from '../lib/auth-types';
import { supabase } from '../lib/supabase';
import { profilesRepo } from '../lib/repos/profiles';
import type { ProfileRow } from '../lib/repos/profiles';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_PROFILE'; payload: Partial<User> };

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, currentUser: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_PROFILE': {
      if (!state.currentUser) return state;
      return { ...state, currentUser: { ...state.currentUser, ...action.payload } };
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function profileRowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar ?? '',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? '',
    isSuperAdmin: row.is_super_admin ?? false,
  };
}

// ---------------------------------------------------------------------------
// Context interface
// ---------------------------------------------------------------------------

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** @deprecated No public signup — stub kept for type compatibility only. */
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  createAccount: (name: string, email: string, password: string) => { success: boolean; error?: string; userId?: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load profile row and dispatch SET_USER
  async function loadProfile() {
    const { data, error } = await profilesRepo.getCurrent();
    if (error || !data) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    dispatch({ type: 'SET_USER', payload: profileRowToUser(data) });
  }

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile();
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    // onAuthStateChange SIGNED_IN will call loadProfile
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT dispatches LOGOUT
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!state.currentUser) return;
    // Optimistically update UI
    dispatch({ type: 'UPDATE_PROFILE', payload: data });
    // Persist to DB (name and avatar are the only patchable fields)
    const patch: Partial<Pick<import('../lib/repos/profiles').ProfileRow, 'name' | 'avatar'>> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (Object.keys(patch).length > 0) {
      await profilesRepo.update(state.currentUser.id, patch);
    }
  }, [state.currentUser]);

  /**
   * register — removed from public use (no signup flow).
   * Stub kept so TypeScript callers compile during the transition period.
   */
  const register = useCallback((_name: string, _email: string, _password: string) => {
    return { success: false, error: 'Public registration is disabled. Contact your admin.' };
  }, []);

  /**
   * createAccount — admin helper.
   * Cannot create Supabase Auth users from the browser without service-role key.
   * Returns a descriptive error; ManagePage will be migrated to invites in Task 16.
   */
  const createAccount = useCallback((_name: string, _email: string, _password: string) => {
    return {
      success: false,
      error: 'Admin account creation requires a backend. Use the invite flow instead.',
    };
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, createAccount, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
