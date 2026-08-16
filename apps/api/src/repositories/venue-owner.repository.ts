import { prisma } from '../config/prisma';

export const venueOwnerRepository = {
  create(businessName: string, contactPhone: string) {
    return prisma.venueOwnerProfile.create({ data: { businessName, contactPhone } });
  },

  findById(id: string) {
    return prisma.venueOwnerProfile.findUnique({ where: { id } });
  },

  list() {
    return prisma.venueOwnerProfile.findMany({ orderBy: { createdAt: 'desc' } });
  },
};
