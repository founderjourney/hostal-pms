import { APIError } from "encore.dev/api";
import * as jwt from "jsonwebtoken";

// JWT secret - in production, this should be an environment secret
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

// Helper function to verify JWT token from Authorization header
export function verifyToken(authHeader?: string): AuthUser {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw APIError.unauthenticated("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw APIError.unauthenticated("Token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw APIError.unauthenticated("Invalid token");
    } else {
      throw APIError.unauthenticated("Token verification failed");
    }
  }
}

// Helper function to check if user has required role
export function requireRole(user: AuthUser, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw APIError.permissionDenied(`Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`);
  }
}