import { NextRequest, NextResponse } from 'next/server';
import { connectDB, isConnected } from './db';

/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create a standardized API response
 */
export function apiResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function apiError(
  message: string,
  status: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

/**
 * Database connection middleware for API routes
 * Ensures database is connected before processing the request
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return withDatabase(request, async () => {
 *     const users = await User.find();
 *     return apiResponse(users);
 *   });
 * }
 */
export async function withDatabase<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiResponse>> {
  try {
    // Ensure database connection
    await connectDB();

    // Execute the handler
    return await handler();
  } catch (error) {
    console.error('[API] Database error:', error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        return apiError('Database connection refused', 503) as NextResponse<T | ApiResponse>;
      }
      if (error.message.includes('timed out')) {
        return apiError('Database connection timed out', 504) as NextResponse<T | ApiResponse>;
      }
      if (error.message.includes('authentication failed')) {
        return apiError('Database authentication failed', 500) as NextResponse<T | ApiResponse>;
      }
    }

    return apiError('Internal server error', 500) as NextResponse<T | ApiResponse>;
  }
}

/**
 * Rate limiting configuration
 * Simple in-memory rate limiter for serverless
 * For production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up old entries
  if (record && now - record.timestamp > windowMs) {
    rateLimitMap.delete(identifier);
  }

  const current = rateLimitMap.get(identifier);

  if (!current) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.timestamp + windowMs,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetAt: current.timestamp + windowMs,
  };
}

/**
 * Get client IP from request headers
 * Works with Vercel's edge network
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Parse pagination parameters from request
 */
export function getPagination(
  request: NextRequest,
  defaults: { page: number; limit: number } = { page: 1, limit: 20 }
): { page: number; limit: number; skip: number } {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || String(defaults.page)));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || String(defaults.limit))));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Add CORS headers to response
 */
export function withCORS(
  response: NextResponse,
  allowedOrigins: string[] = ['*']
): NextResponse {
  const origin = allowedOrigins.includes('*') ? '*' : allowedOrigins.join(',');

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}
