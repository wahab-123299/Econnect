import { prisma } from '../config/prisma';
import type { VerificationStatus } from '@prisma/client';

export const organizerRepository = {
  findByUserId(userId: string) {
    return prisma.organizerProfile.findUnique({ where: { userId } });
  },

  findById(id: string) {
    return prisma.organizerProfile.findUnique({ where: { id } });
  },

  create(userId: string, businessName?: string) {
    return prisma.organizerProfile.create({ data: { userId, businessName } });
  },

  listByStatus(status: VerificationStatus) {
    return prisma.organizerProfile.findMany({
      where: { verificationStatus: status },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  setVerification(id: string, status: VerificationStatus, verifiedBy: string) {
    return prisma.organizerProfile.update({
      where: { id },
      data: { verificationStatus: status, verifiedAt: new Date(), verifiedBy },
    });
  },
};
