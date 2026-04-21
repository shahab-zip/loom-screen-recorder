import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { User } from '../lib/auth-types';
import { getStorageItem, setStorageItem, removeStorageItem } from '../lib/storage';

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
      const updated = { ...state.currentUser, ...action.payload };
      return { ...state, currentUser: updated };
    }
    default:
      return state;
  }
}

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredCredential {
  userId: string;
  email: string;
  passwordHash: string;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const sessionUserId = getStorageItem<string | null>('auth-session', null);
    if (sessionUserId) {
      const users = getStorageItem<User[]>('auth-users', []);
      const user = users.find(u => u.id === sessionUserId);
      if (user) {
        const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
        dispatch({ type: 'SET_USER', payload: updatedUser });
        const updatedUsers = users.map(u => u.id === sessionUserId ? updatedUser : u);
        setStorageItem('auth-users', updatedUsers);
        return;
      }
    }
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const login = useCallback((email: string, password: string) => {
    const creds = getStorageItem<StoredCredential[]>('auth-credentials', []);
    const cred = creds.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!cred) return { success: false, error: 'No account found with this email' };
    if (cred.passwordHash !== simpleHash(password)) return { success: false, error: 'Incorrect password' };

    const users = getStorageItem<User[]>('auth-users', []);
    const user = users.find(u => u.id === cred.userId);
    if (!user) return { success: false, error: 'User data corrupted' };

    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    dispatch({ type: 'SET_USER', payload: updatedUser });
    setStorageItem('auth-session', user.id);
    const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
    setStorageItem('auth-users', updatedUsers);
    return { success: true };
  }, []);

  const register = useCallback((name: string, email: string, password: string) => {
    const creds = getStorageItem<StoredCredential[]>('auth-credentials', []);
    if (creds.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const userId = `user_${Date.now()}`;
    const now = new Date().toISOString();
    const newUser: User = {
      id: userId,
      name,
      email,
      avatar: '',
      createdAt: now,
      lastLoginAt: now,
    };

    const newCred: StoredCredential = {
      userId,
      email: email.toLowerCase(),
      passwordHash: simpleHash(password),
    };

    const users = getStorageItem<User[]>('auth-users', []);
    setStorageItem('auth-users', [...users, newUser]);
    setStorageItem('auth-credentials', [...creds, newCred]);
    setStorageItem('auth-session', userId);

    dispatch({ type: 'SET_USER', payload: newUser });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    removeStorageItem('auth-session');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback((data: Partial<User>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: data });
    const users = getStorageItem<User[]>('auth-users', []);
    if (state.currentUser) {
      const updated = users.map(u =>
        u.id === state.currentUser!.id ? { ...u, ...data } : u
      );
      setStorageItem('auth-users', updated);
    }
  }, [state.currentUser]);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
