import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload, UserRole, SafeUser } from '@/types';
import connectDB from './db';
import User from '@/models/User';
import {
  checkLoginAllowed,
  recordFailedLogin,
  clearLoginAttempts,
  isTokenBlacklisted,
} from './security';

// SECURITY: JWT secret must be set in production
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production');
  }
  console.warn('WARNING: JWT_SECRET not set. Using insecure default for development only.');
}

const SECURE_JWT_SECRET = JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-production';
const SECURE_REFRESH_SECRET = REFRESH_TOKEN_SECRET || 'dev-only-refresh-secret-do-not-use-in-production';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface AuthResult {
  success: boolean;
  user?: SafeUser;
  error?: string;
}

// Generate JWT token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECURE_JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

// Generate refresh token (uses separate secret for additional security)
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, SECURE_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Check if token is blacklisted (for logout/revocation)
    if (isTokenBlacklisted(token)) {
      return null;
    }
    return jwt.verify(token, SECURE_JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    if (isTokenBlacklisted(token)) {
      return null;
    }
    const payload = jwt.verify(token, SECURE_REFRESH_SECRET) as JWTPayload & { type?: string };
    if (payload.type !== 'refresh') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Get current user from request
export async function getCurrentUser(request?: NextRequest): Promise<SafeUser | null> {
  try {
    let token: string | undefined;

    if (request) {
      // Get token from Authorization header or cookie
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = request.cookies.get('auth-token')?.value;
      }
    } else {
      // Server component - use cookies()
      const cookieStore = await cookies();
      token = cookieStore.get('auth-token')?.value;
    }

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    await connectDB();
    const user = await User.findById(payload.userId).select('-passwordHash');

    if (!user || user.isDeleted) {
      return null;
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role as UserRole,
      familyId: user.familyId?.toString(),
      preferences: user.preferences,
    };
  } catch {
    return null;
  }
}

// Authenticate user with email and password
export async function authenticateUser(
  email: string,
  password: string,
  clientIp?: string
): Promise<{ user: SafeUser; token: string; refreshToken: string } | { error: string; lockedUntil?: Date } | null> {
  try {
    // Brute force protection - check by email and optionally by IP
    const emailKey = `login:${email.toLowerCase()}`;
    const ipKey = clientIp ? `login:ip:${clientIp}` : null;

    const emailCheck = checkLoginAllowed(emailKey);
    if (!emailCheck.allowed) {
      return {
        error: 'Too many failed login attempts. Account temporarily locked.',
        lockedUntil: emailCheck.lockedUntil
      };
    }

    if (ipKey) {
      const ipCheck = checkLoginAllowed(ipKey);
      if (!ipCheck.allowed) {
        return {
          error: 'Too many failed login attempts from this IP. Please try again later.',
          lockedUntil: ipCheck.lockedUntil
        };
      }
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false })
      .select('+passwordHash');

    if (!user) {
      // Record failed attempt but don't reveal if user exists
      recordFailedLogin(emailKey);
      if (ipKey) recordFailedLogin(ipKey);
      return null;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Record failed attempt
      recordFailedLogin(emailKey);
      if (ipKey) recordFailedLogin(ipKey);
      return null;
    }

    // Clear failed attempts on successful login
    clearLoginAttempts(emailKey);
    if (ipKey) clearLoginAttempts(ipKey);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
      familyId: user.familyId?.toString(),
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role as UserRole,
        familyId: user.familyId?.toString(),
        preferences: user.preferences,
      },
      token,
      refreshToken,
    };
  } catch {
    return null;
  }
}

// Set auth cookies
export function setAuthCookies(token: string, refreshToken?: string): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  // Note: This is for API routes. For server actions, use cookies() directly
  // The actual cookie setting happens in the API route response
}

// Clear auth cookies
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.delete('auth-token');
  response.cookies.delete('refresh-token');
  return response;
}

// RBAC Permission checks
export const permissions = {
  // System Admin can do everything
  [UserRole.SYSTEM_ADMIN]: {
    canManageAllFamilies: true,
    canApprovePublicFamilies: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canExportData: true,
    canDeleteData: true,
    canAccessDashboard: true,
  },
  // Family Admin can manage their family
  [UserRole.FAMILY_ADMIN]: {
    canManageFamily: true,
    canApproveContent: true,
    canManageMembers: true,
    canViewFamilyAuditLogs: true,
    canExportFamilyData: true,
    canEditFamilyTree: true,
    canAccessDashboard: true,
  },
  // Family Member can contribute
  [UserRole.FAMILY_MEMBER]: {
    canViewFamily: true,
    canSubmitContent: true,
    canEditOwnContent: true,
    canViewFamilyTree: true,
    canAddChildren: true,
  },
  // Guest can only view public content
  [UserRole.GUEST]: {
    canViewPublicFamilies: true,
    canViewPublicContent: true,
  },
};

export type Permission = keyof typeof permissions[UserRole.SYSTEM_ADMIN] |
  keyof typeof permissions[UserRole.FAMILY_ADMIN] |
  keyof typeof permissions[UserRole.FAMILY_MEMBER] |
  keyof typeof permissions[UserRole.GUEST];

// Check if user has permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = permissions[role] as Record<string, boolean>;
  return rolePermissions?.[permission] === true;
}

// Check if user can access family
export function canAccessFamily(
  userRole: UserRole,
  userFamilyId: string | undefined,
  targetFamilyId: string,
  familyIsPublic: boolean
): boolean {
  // System admin can access all families
  if (userRole === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  // User belongs to this family
  if (userFamilyId === targetFamilyId) {
    return true;
  }

  // Family is public - anyone can view public content
  if (familyIsPublic) {
    return true;
  }

  return false;
}

// Check if user can modify content
export function canModifyContent(
  userRole: UserRole,
  userId: string,
  contentCreatorId: string,
  userFamilyId: string | undefined,
  contentFamilyId: string
): boolean {
  // System admin can modify anything
  if (userRole === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  // Family admin can modify content in their family
  if (userRole === UserRole.FAMILY_ADMIN && userFamilyId === contentFamilyId) {
    return true;
  }

  // Content creator can modify their own content
  if (userId === contentCreatorId) {
    return true;
  }

  return false;
}

// Middleware helper for protected routes
export function withAuth(
  handler: (request: NextRequest, user: SafeUser) => Promise<NextResponse>,
  options?: {
    roles?: UserRole[];
    permissions?: Permission[];
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check role requirement
    if (options?.roles && !options.roles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role' },
        { status: 403 }
      );
    }

    // Check permission requirements
    if (options?.permissions) {
      const hasAllPermissions = options.permissions.every(
        (perm) => hasPermission(user.role, perm)
      );
      if (!hasAllPermissions) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return handler(request, user);
  };
}

// Helper to require specific roles
export function requireRoles(...roles: UserRole[]) {
  return { roles };
}

// Helper to require specific permissions
export function requirePermissions(...perms: Permission[]) {
  return { permissions: perms };
}
