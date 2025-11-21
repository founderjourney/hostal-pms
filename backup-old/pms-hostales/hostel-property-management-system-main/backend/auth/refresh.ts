import { api } from "encore.dev/api";
import db from "../db";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT secret - in production, this should be an environment secret
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "15m"; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // Refresh token expires in 7 days

// Refreshes an access token using a valid refresh token
export const refresh = api<RefreshTokenRequest, RefreshTokenResponse>(
  { expose: true, method: "POST", path: "/auth/refresh" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/auth/refresh", "POST");

    try {
      return await withPerformanceLogging("refresh", async () => {
        // Validate input
        validate.required(req.refreshToken, "refreshToken");

        const refreshTokenHash = crypto.createHash('sha256').update(req.refreshToken).digest('hex');

        // Find the refresh token in the database
        let tokenRecord: any;
        try {
          tokenRecord = await db.queryRow`
            SELECT rt.id, rt.user_id, rt.expires_at, rt.is_revoked,
                   u.id as user_id, u.email, u.role, u.is_active
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = ${refreshTokenHash}
              AND rt.expires_at > NOW()
              AND rt.is_revoked = false
              AND u.is_active = true
          `;
        } catch (error: any) {
          handleDatabaseError(error, "finding refresh token");
        }

        if (!tokenRecord) {
          logger.securityEvent("Invalid or expired refresh token used", "medium");
          throw createError.unauthorized("Invalid or expired refresh token");
        }

        // Update last used timestamp
        try {
          await db.exec`
            UPDATE refresh_tokens 
            SET last_used_at = NOW() 
            WHERE id = ${tokenRecord.id}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "updating token last used timestamp");
        }

        // Generate new access token
        let accessToken: string;
        try {
          accessToken = jwt.sign(
            {
              userId: tokenRecord.user_id,
              email: tokenRecord.email,
              role: tokenRecord.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );
        } catch (error) {
          logger.error("JWT generation failed during refresh", { userId: tokenRecord.user_id }, error as Error);
          throw createError.internal("Token generation failed");
        }

        // Generate new refresh token
        const newRefreshToken = crypto.randomBytes(64).toString('hex');
        const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        
        // Store new refresh token and revoke the old one
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
        
        let tx: any;
        try {
          tx = await db.begin();
          
          // Revoke old refresh token
          await tx.exec`
            UPDATE refresh_tokens 
            SET is_revoked = true 
            WHERE id = ${tokenRecord.id}
          `;
          
          // Insert new refresh token
          await tx.exec`
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (${tokenRecord.user_id}, ${newRefreshTokenHash}, ${expiresAt})
          `;
          
          await tx.commit();
        } catch (error: any) {
          if (tx) {
            try {
              await tx.rollback();
            } catch (rollbackError) {
              logger.error("Transaction rollback failed", { userId: tokenRecord.user_id }, rollbackError as Error);
            }
          }
          handleDatabaseError(error, "refreshing token transaction");
        }

        logger.authEvent("Token refreshed", tokenRecord.user_id, { email: tokenRecord.email });

        return {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 15 * 60, // 15 minutes in seconds
        };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/auth/refresh", "POST", error, { duration });
      logAndThrowError(error);
    }
  }
);