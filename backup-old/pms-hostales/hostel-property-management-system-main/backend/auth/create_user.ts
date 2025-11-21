import { api } from "encore.dev/api";
import db from "../db";
import * as bcrypt from "bcrypt";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate, sanitize } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: "admin" | "manager" | "volunteer";
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

// Creates a new user account
export const createUser = api<CreateUserRequest, User>(
  { expose: true, method: "POST", path: "/auth/users" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/auth/users", "POST");

    try {
      return await withPerformanceLogging("createUser", async () => {
        // Validate and sanitize input
        validate.required(req.email, "email");
        validate.required(req.name, "name");
        validate.required(req.password, "password");
        validate.required(req.role, "role");
        
        validate.email(req.email);
        validate.password(req.password);
        validate.stringLength(req.name, 1, 100, "name");
        validate.enumValue(req.role, ["admin", "manager", "volunteer"], "role");

        const sanitizedEmail = sanitize.email(req.email);
        const sanitizedName = sanitize.name(req.name);

        // Check if user already exists
        try {
          const existingUser = await db.queryRow`
            SELECT id FROM users WHERE email = ${sanitizedEmail}
          `;

          if (existingUser) {
            logger.warn("Attempt to create user with existing email", { email: sanitizedEmail });
            throw createError.alreadyExists("User", "email");
          }
        } catch (error: any) {
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "checking existing user");
        }

        // Hash the password
        const saltRounds = 12;
        let passwordHash: string;
        try {
          passwordHash = await bcrypt.hash(req.password, saltRounds);
        } catch (error) {
          logger.error("Password hashing failed", {}, error as Error);
          throw createError.internal("Failed to process password");
        }

        // Create user
        try {
          const user = await db.queryRow`
            INSERT INTO users (email, name, role, password_hash)
            VALUES (${sanitizedEmail}, ${sanitizedName}, ${req.role}, ${passwordHash})
            RETURNING id, email, name, role, is_active, created_at
          `;

          if (!user) {
            throw createError.internal("Failed to create user");
          }

          logger.info("User created successfully", { userId: user.id, email: sanitizedEmail, role: req.role });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at,
          };
        } catch (error: any) {
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "creating user");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/auth/users", "POST", error, { duration });
      logAndThrowError(error);
    }
  }
);
