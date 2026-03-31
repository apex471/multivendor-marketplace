import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { sendUnauthorized } from '../utils/response';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT token
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<boolean> {
  try {
    const token = extractToken(req);

    if (!token) {
      sendUnauthorized(res, 'No authentication token provided');
      return false;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      sendUnauthorized(res, 'Invalid or expired token');
      return false;
    }

    // Attach user to request
    req.user = decoded;
    return true;
  } catch (error) {
    sendUnauthorized(res, 'Authentication failed');
    return false;
  }
}

/**
 * Extract token from request (Bearer token from Authorization header)
 */
export function extractToken(req: AuthenticatedRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to check user role
 */
export function checkRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: NextApiResponse): boolean => {
    if (!req.user) {
      sendUnauthorized(res, 'User not authenticated');
      return false;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
        statusCode: 403,
      });
      return false;
    }

    return true;
  };
}

/**
 * Combined middleware for authentication and authorization
 */
export async function protectedRoute(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  allowedRoles?: string[]
): Promise<boolean> {
  // Authenticate
  const isAuthenticated = await authMiddleware(req, res);
  if (!isAuthenticated) {
    return false;
  }

  // Check role if specified
  if (allowedRoles && allowedRoles.length > 0) {
    return checkRole(allowedRoles)(req, res);
  }

  return true;
}
