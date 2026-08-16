import type { SignOptions } from 'jsonwebtoken';

// Fail fast at boot if required secrets are missing, rather than discovering it
// mid-request when a token can't be signed. Extend this list as new env vars
// become required by newly built features.
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'QR_SIGNING_SECRET',
] as const;

export function assertRequiredEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET as string,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET as string,
  accessTokenTtl: '15m' as SignOptions['expiresIn'],
  refreshTokenTtlDays: 30,
};
