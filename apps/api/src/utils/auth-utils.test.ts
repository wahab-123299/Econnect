import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';
import { generateRefreshToken, hashRefreshToken, signAccessToken, verifyAccessToken } from './tokens';

describe('password utils', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });
});

describe('refresh token utils', () => {
  it('generates unique high-entropy tokens', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(64);
  });

  it('hashes a token deterministically', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });
});

describe('access token', () => {
  it('signs and verifies a payload round-trip', () => {
    const token = signAccessToken({ sub: 'user-123', role: 'attendee' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('attendee');
  });
});
