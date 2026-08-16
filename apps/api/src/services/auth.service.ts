import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from '../utils/tokens';
import { env } from '../config/env';
import { AppError } from '../middleware/error-handler';
import type { User } from '@prisma/client';

interface RegisterInput {
  email?: string;
  phone?: string;
  password: string;
  fullName: string;
}

interface LoginInput {
  emailOrPhone: string;
  password: string;
}

function toUserDTO(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
  };
}

async function issueTokenPair(user: User) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.create(user.id, hashRefreshToken(refreshToken), expiresAt);
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput) {
    if (!input.email && !input.phone) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Email or phone is required.');
    }

    if (input.email && (await userRepository.findByEmail(input.email))) {
      throw new AppError(409, 'EMAIL_OR_PHONE_TAKEN', 'An account with this email already exists.');
    }
    if (input.phone && (await userRepository.findByPhone(input.phone))) {
      throw new AppError(409, 'EMAIL_OR_PHONE_TAKEN', 'An account with this phone already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      phone: input.phone,
      passwordHash,
      fullName: input.fullName,
    });

    const tokens = await issueTokenPair(user);
    return { user: toUserDTO(user), ...tokens };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmailOrPhone(input.emailOrPhone);
    if (!user || !user.passwordHash) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email/phone or password.');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email/phone or password.');
    }

    const tokens = await issueTokenPair(user);
    return { user: toUserDTO(user), ...tokens };
  },

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await refreshTokenRepository.findValidByHash(tokenHash);
    if (!existing) {
      throw new AppError(401, 'INVALID_OR_REVOKED_TOKEN', 'Please log in again.');
    }

    // Rotate: revoke the used token and issue a brand new pair. This limits the
    // blast radius if a refresh token is ever stolen — a replayed old token fails.
    await refreshTokenRepository.revoke(existing.id);

    const user = await userRepository.findById(existing.userId);
    if (!user) {
      throw new AppError(401, 'INVALID_OR_REVOKED_TOKEN', 'Please log in again.');
    }

    const tokens = await issueTokenPair(user);
    return { user: toUserDTO(user), ...tokens };
  },

  async logout(rawRefreshToken: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await refreshTokenRepository.findValidByHash(tokenHash);
    if (existing) {
      await refreshTokenRepository.revoke(existing.id);
    }
    // Always succeed even if the token was already invalid — logout is idempotent
    // from the client's perspective.
  },

  async getById(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    return toUserDTO(user);
  },

  verifyAccessToken,
};
