import { prisma } from '../config/prisma';

export const verificationLogRepository = {
  create(data: {
    adminId: string;
    targetType: 'organizer' | 'venue';
    targetId: string;
    action: 'approved' | 'rejected';
    notes?: string;
  }) {
    return prisma.verificationLog.create({ data });
  },
};
