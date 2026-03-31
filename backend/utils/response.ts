import { NextApiResponse } from 'next';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
  statusCode: number;
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: NextApiResponse,
  message: string,
  data?: T,
  statusCode: number = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    statusCode,
  };
  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: NextApiResponse,
  message: string,
  errors?: Record<string, string>,
  statusCode: number = 400
) {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
    statusCode,
  };
  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: NextApiResponse,
  errors: Record<string, string>
) {
  const response: ApiResponse = {
    success: false,
    message: 'Validation failed',
    errors,
    statusCode: 422,
  };
  res.status(422).json(response);
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: NextApiResponse, message: string = 'Unauthorized') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 401,
  };
  res.status(401).json(response);
}

/**
 * Send forbidden response
 */
export function sendForbidden(res: NextApiResponse, message: string = 'Forbidden') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 403,
  };
  res.status(403).json(response);
}

/**
 * Send not found response
 */
export function sendNotFound(res: NextApiResponse, message: string = 'Not found') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 404,
  };
  res.status(404).json(response);
}

/**
 * Send internal server error response
 */
export function sendServerError(
  res: NextApiResponse,
  message: string = 'Internal server error',
  error?: any
) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Server error:', error);
  }

  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 500,
  };
  res.status(500).json(response);
}
