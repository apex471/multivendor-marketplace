'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  loginUser,
  signupUser,
  googleLogin as googleLoginAPI,
  storeAuthToken,
  getAuthToken,
  clearAuthToken,
  storeUser,
  getStoredUser,
  clearUserData,
} from '@/lib/api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: any) => Promise<boolean>;
  googleLogin: (googleToken: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
}

/**
 * Normalize the backend user response to match the frontend User type.
 * Backend returns firstName/lastName; frontend expects fullName too.
 */
function normalizeUser(backendUser: any): User {
  return {
    id: backendUser.id,
    email: backendUser.email,
    username: backendUser.email?.split('@')[0] ?? '',
    role: backendUser.role,
    fullName: `${backendUser.firstName ?? ''} ${backendUser.lastName ?? ''}`.trim(),
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    avatar: backendUser.avatar ?? undefined,
    bio: backendUser.bio ?? undefined,
    phoneNumber: backendUser.phoneNumber ?? undefined,
    isEmailVerified: backendUser.isEmailVerified ?? false,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate auth state from localStorage on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        const storedUser = getStoredUser();

        if (token && storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        clearAuthToken();
        clearUserData();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await loginUser({ email, password });

      if (!response.success || !response.data) {
        setError(response.message || 'Login failed. Please check your credentials.');
        return false;
      }

      const normalizedUser = normalizeUser(response.data.user);
      storeAuthToken(response.data.token);
      storeUser(normalizedUser);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      setError(null);

      return true;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await signupUser(data);

      if (!response.success || !response.data) {
        setError(response.message || 'Signup failed');
        return false;
      }

      const normalizedUser = normalizeUser(response.data.user);
      storeAuthToken(response.data.token);
      storeUser(normalizedUser);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      setError(null);

      return true;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during signup');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (googleToken: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await googleLoginAPI(googleToken);

      if (!response.success || !response.data) {
        setError(response.message || 'Google sign-in failed. Please try again.');
        return false;
      }

      const normalizedUser = normalizeUser(response.data.user);
      storeAuthToken(response.data.token);
      storeUser(normalizedUser);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      setError(null);

      return true;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during Google sign-in');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    clearUserData();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      storeUser(updatedUser);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
        login,
        signup,
        googleLogin,
        logout,
        updateUser,
        clearError,
      }}
    >
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
