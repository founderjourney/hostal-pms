import { api } from "encore.dev/api";
import db from "../db";
import * as crypto from "crypto";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
}

// Logs out a user by revoking their refresh token
export const logout = api<LogoutRequest, LogoutResponse>(
  { expose: true, method: "POST", path: "/auth/logout" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/auth/logout", "POST");

    try {
      return await withPerformanceLogging("logout", async () => {
        // Validate input
        validate.required(req.refreshToken, "refreshToken");

        const refreshTokenHash = crypto.createHash('sha256').update(req.refreshToken).digest('hex');

        // Revoke the refresh token
        try {
          const result = await db.exec`
            UPDATE refresh_tokens 
            SET is_revoked = true 
            WHERE token_hash = ${refreshTokenHash}
          `;

          logger.authEvent("User logout", undefined, { tokenRevoked: true });

          return {
            success: true,
          };
        } catch (error: any) {
          handleDatabaseError(error, "revoking refresh token");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/auth/logout", "POST", error, { duration });
      logAndThrowError(error);
    }
  }
);

// Logs out all sessions for a user (requires valid refresh token to identify user)
export const logoutAll = api<LogoutRequest, LogoutResponse>(
  { expose: true, method: "POST", path: "/auth/logout-all" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/auth/logout-all", "POST");

    try {
      return await withPerformanceLogging("logoutAll", async () => {
        // Validate input
        validate.required(req.refreshToken, "refreshToken");

        const refreshTokenHash = crypto.createHash('sha256').update(req.refreshToken).digest('hex');

        // Find the user ID from the refresh token
        let tokenRecord: any;
        try {
          tokenRecord = await db.queryRow`
            SELECT user_id FROM refresh_tokens 
            WHERE token_hash = ${refreshTokenHash} AND is_revoked = false
          `;
        } catch (error: any) {
          handleDatabaseError(error, "finding refresh token");
        }

        if (!tokenRecord) {
          logger.securityEvent("Invalid refresh token used for logout-all", "medium");
          throw createError.unauthorized("Invalid refresh token");
        }

        // Revoke all refresh tokens for this user
        try {
          await db.exec`
            UPDATE refresh_tokens 
            SET is_revoked = true 
            WHERE user_id = ${tokenRecord.user_id} AND is_revoked = false
          `;

          logger.authEvent("User logout from all sessions", tokenRecord.user_id);

          return {
            success: true,
          };
        } catch (error: any) {
          handleDatabaseError(error, "revoking all refresh tokens");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/auth/logout-all", "POST", error, { duration });
      logAndThrowError(error);
    }
  }
);