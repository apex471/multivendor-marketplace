import { OAuth2Client } from 'google-auth-library';

// ---------------------------------------------------------------------------
// Lazy client — created on first use, NOT at module load time.
// Creating the client at module level would execute during Next.js static
// analysis (next build) even when the env vars are not yet available, which
// causes cryptic build errors on Netlify CI.
// ---------------------------------------------------------------------------
let _client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!_client) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('[Google OAuth] Credentials not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Netlify env vars.');
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/auth/google/callback`;
    _client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }
  return _client;
}

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
    const ticket = await getClient().verifyIdToken({
      idToken: token,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
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

  return getClient().generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}
