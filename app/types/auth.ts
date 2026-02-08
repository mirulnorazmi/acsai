/**
 * Auth Module Type Definitions
 * Types for user profiles, secrets, and auth requests
 */

import { type NextAuthOptions } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    accounts?: Array<{
      provider: string;
      providerAccountId: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}

/**
 * User Profile
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  preferences?: Record<string, any>; // JSONB
  created_at: string;
  updated_at: string;
}

/**
 * Auth Response Types
 */

// POST /api/auth/register
export interface RegisterResponse {
  user_id: string;
  token?: string; // Only if registration auto-signs in (optional)
  email: string;
}

// POST /api/auth/login
export interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
  expires_in: number;
}

// GET /api/auth/me
export interface MeResponse {
  id: string;
  email: string;
  full_name?: string;
  preferences?: Record<string, any>;
}

/**
 * User Secret (API Key)
 */
export interface UserSecret {
  id: string;
  user_id: string;
  platform: string;
  api_key: string; // Should be encrypted in DB, returned decrypted if needed
  api_secret?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// POST /api/auth/keys
export interface StoreKeyResponse {
  status: 'success';
  platform: string;
  key_id?: string;
}
