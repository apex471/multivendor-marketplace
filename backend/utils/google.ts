import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn('Google OAuth credentials not configured');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/google/callback`);

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

/**
 * Verify Google OAuth token
 */
export async function verifyGoogleToken(token: string): Promise<GoogleTokenPayload | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleTokenPayload;
    return payload;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}

/**
 * Get Google user info from token
 */
export function getGoogleUserInfo(payload: GoogleTokenPayload) {
  return {
    googleId: payload.sub,
    email: payload.email,
    firstName: payload.given_name || payload.name?.split(' ')[0] || '',
    lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
    avatar: payload.picture,
    isEmailVerified: payload.email_verified,
  };
}

/**
 * Verify Google access token (alternative method)
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying Google access token:', error);
    return null;
  }
}

/**
 * Create Google login URL for backend OAuth flow
 */
export function getGoogleAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}
