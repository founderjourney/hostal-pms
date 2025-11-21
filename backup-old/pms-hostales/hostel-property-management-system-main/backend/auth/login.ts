import { api } from "encore.dev/api";
import db from "../db";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate, sanitize } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT secret - in production, this should be an environment secret
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "15m"; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // Refresh token expires in 7 days

// Authenticates a user with email and password
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const startTime = Date.now();
    const sanitizedEmail = req.email ? sanitize.email(req.email) : "";
    logger.apiRequest("/auth/login", "POST", { email: sanitizedEmail });

    try {
      return await withPerformanceLogging("login", async () => {
        // Validate input
        validate.required(req.email, "email");
        validate.required(req.password, "password");
        validate.email(req.email);

        // Get user with password hash
        let user: any;
        try {
          user = await db.queryRow`
            SELECT id, email, name, role, password_hash, is_active 
            FROM users 
            WHERE email = ${sanitizedEmail} AND is_active = true
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching user for login");
        }

        if (!user || !user.password_hash) {
          logger.securityEvent("Failed login attempt - invalid email", "medium", { email: sanitizedEmail });
          throw createError.invalidCredentials({ email: sanitizedEmail });
        }

        // Verify password
        let isValidPassword: boolean;
        try {
          isValidPassword = await bcrypt.compare(req.password, user.password_hash);
        } catch (error) {
          logger.error("Password comparison failed", { userId: user.id }, error as Error);
          throw createError.internal("Authentication processing failed");
        }

        if (!isValidPassword) {
          logger.securityEvent("Failed login attempt - invalid password", "medium", { 
            email: sanitizedEmail, 
            userId: user.id 
          });
          throw createError.invalidCredentials({ email: sanitizedEmail });
        }

        // Generate access token (JWT)
        let accessToken: string;
        try {
          accessToken = jwt.sign(
            {
              userId: user.id,
              email: user.email,
              role: user.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
        } catch (error) {
          logger.error("JWT generation failed", { userId: user.id }, error as Error);
          throw createError.internal("Token generation failed");
        }

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
        
        try {
          await db.exec`
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (${user.id}, ${refreshTokenHash}, ${expiresAt})
          `;

          // Clean up expired refresh tokens for this user
          await db.exec`
            DELETE FROM refresh_tokens 
            WHERE user_id = ${user.id} AND expires_at < NOW()
          `;
        } catch (error: any) {
          handleDatabaseError(error, "storing refresh token");
        }

        logger.authEvent("User login successful", user.id, { email: sanitizedEmail, role: user.role });

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
          expiresIn: 15 * 60, // 15 minutes in seconds
        };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/auth/login", "POST", error, { duration, email: sanitizedEmail });
      logAndThrowError(error);
    }
  }
);
