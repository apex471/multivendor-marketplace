/**
 * Authentication API Service
 * Handles all auth-related API calls
 */

// Always use a relative path — the app and its API routes share the same origin
// on every environment (local dev, Netlify, etc.). Using NEXT_PUBLIC_API_URL
// was causing login failures when that variable was set to an absolute URL in
// Netlify environment variables.
const API_URL = '/api';

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  role?: 'customer' | 'vendor' | 'brand';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      avatar?: string;
      isEmailVerified?: boolean;
    };
    token: string;
    requiresEmailVerification?: boolean;
  };
  errors?: Record<string, string>;
  statusCode: number;
}

export async function signupUser(data: SignupData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      message: 'An error occurred during signup',
      statusCode: 500,
    };
  }
}

export async function loginUser(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // If the server returned HTML (e.g. Netlify crash page), json() will throw
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      console.error('[loginUser] Non-JSON response:', response.status, contentType);
      return {
        success: false,
        message: `Server error (${response.status}). Please try again.`,
        statusCode: response.status,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[loginUser] Fetch failed:', error);
    return {
      success: false,
      message: 'Unable to reach the server. Check your connection and try again.',
      statusCode: 0,
    };
  }
}

/**
 * Google OAuth Login/Signup
 * This function is called from the frontend Google login button
 * The Google token is passed to the backend for verification
 */
export async function googleLogin(googleToken: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: googleToken,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Google login error:', error);
    return {
      success: false,
      message: 'An error occurred during Google login',
      statusCode: 500,
    };
  }
}

export const API_ENDPOINTS = {
  SIGNUP: `${API_URL}/auth/signup`,
  LOGIN: `${API_URL}/auth/login`,
  GOOGLE: `${API_URL}/auth/google`,
  ME: `${API_URL}/auth/me`,
  PROFILE: `${API_URL}/auth/profile`,
  CHANGE_PASSWORD: `${API_URL}/auth/change-password`,
};

export interface GetCurrentUserResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      avatar?: string;
      isEmailVerified: boolean;
    };
  };
  statusCode: number;
}

export async function getCurrentUserProfile(): Promise<GetCurrentUserResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'No auth token found',
        statusCode: 401,
      };
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      success: false,
      message: 'An error occurred while fetching user profile',
      statusCode: 500,
    };
  }
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  bio?: string;
  avatar?: string;
}

export async function updateUserProfile(
  data: UpdateProfileData
): Promise<AuthResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'No auth token found',
        statusCode: 401,
      };
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      message: 'An error occurred while updating profile',
      statusCode: 500,
    };
  }
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changeUserPassword(
  data: ChangePasswordData
): Promise<AuthResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'No auth token found',
        statusCode: 401,
      };
    }

    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: 'An error occurred while changing password',
      statusCode: 500,
    };
  }
}

// Helper functions for token and user storage
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const token = localStorage.getItem('authToken');
  return !!token;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('authToken');
}

export function storeAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
}

/**
 * Store token + user together and immediately notify AuthContext.
 * Use this after every direct API login/signup call so the session
 * is reflected in the Header and other context consumers right away.
 */
export function setAuthSession(token: string, user: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    // Dispatch event so AuthContext picks up the new state in the same tab
    window.dispatchEvent(new Event('auth-state-changed'));
  }
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
}

export function getStoredUser(): any {
  if (typeof window === 'undefined') {
    return null;
  }
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function storeUser(user: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function clearUserData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
}

export function logout(): void {
  clearAuthToken();
  clearUserData();
}


