import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
  statusCode: number;
}

/**
 * Send success response (App Router)
 */
export function sendSuccess<T>(
  data: T,
  message: string = 'Success',
  statusCode: number = 200
) {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    statusCode,
  };
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Send error response (App Router)
 */
export function sendError(
  message: string,
  statusCode: number = 400,
  errors?: Record<string, string>
) {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
    statusCode,
  };
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Send validation error response (App Router)
 */
export function sendValidationError(
  message: string,
  errors: Record<string, string>,
  statusCode: number = 422
) {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
    statusCode,
  };
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Send unauthorized response (App Router)
 */
export function sendUnauthorized(message: string = 'Unauthorized') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 401,
  };
  return NextResponse.json(response, { status: 401 });
}

/**
 * Send forbidden response (App Router)
 */
export function sendForbidden(message: string = 'Forbidden') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 403,
  };
  return NextResponse.json(response, { status: 403 });
}

/**
 * Send not found response (App Router)
 */
export function sendNotFound(message: string = 'Not found') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 404,
  };
  return NextResponse.json(response, { status: 404 });
}

/**
 * Send server error response (App Router)
 */
export function sendServerError(message: string = 'Internal server error') {
  const response: ApiResponse = {
    success: false,
    message,
    statusCode: 500,
  };
  return NextResponse.json(response, { status: 500 });
}
