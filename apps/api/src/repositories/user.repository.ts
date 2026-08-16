import { prisma } from '../config/prisma';
import type { User } from '@prisma/client';

export const userRepository = {
  findByEmailOrPhone(emailOrPhone: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
    });
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: {
    email?: string;
    phone?: string;
    passwordHash?: string;
    fullName: string;
    googleId?: string;
  }): Promise<User> {
    return prisma.user.create({ data });
  },
};
