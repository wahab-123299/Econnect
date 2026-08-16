import { prisma } from '../config/prisma';
import { organizerRepository } from '../repositories/organizer.repository';
import { verificationLogRepository } from '../repositories/verification-log.repository';
import { AppError } from '../middleware/error-handler';
import type { OrganizerProfile } from '@prisma/client';

function toOrganizerDTO(profile: OrganizerProfile) {
  return {
    id: profile.id,
    businessName: profile.businessName,
    verificationStatus: profile.verificationStatus,
    verifiedAt: profile.verifiedAt,
  };
}

export const organizerService = {
  async apply(userId: string, businessName?: string) {
    const existing = await organizerRepository.findByUserId(userId);
    if (existing) {
      throw new AppError(
        409,
        'ORGANIZER_PROFILE_EXISTS',
        'You already have an organizer profile.',
      );
    }

    // Create the profile and flip the user's role in one transaction — we never
    // want a user stuck with role=organizer but no profile, or vice versa.
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.organizerProfile.create({ data: { userId, businessName } });
      await tx.user.update({ where: { id: userId }, data: { role: 'organizer' } });
      return created;
    });

    return toOrganizerDTO(profile);
  },

  async getMyProfile(userId: string) {
    const profile = await organizerRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError(404, 'ORGANIZER_PROFILE_NOT_FOUND', 'No organizer profile found.');
    }
    return toOrganizerDTO(profile);
  },

  async listPending() {
    const profiles = await organizerRepository.listByStatus('pending');
    return profiles.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      createdAt: p.createdAt,
      user: p.user,
    }));
  },

  async verify(organizerId: string, adminId: string, action: 'approve' | 'reject', notes?: string) {
    const profile = await organizerRepository.findById(organizerId);
    if (!profile) {
      throw new AppError(404, 'ORGANIZER_PROFILE_NOT_FOUND', 'Organizer profile not found.');
    }
    if (profile.verificationStatus !== 'pending') {
      throw new AppError(
        409,
        'ALREADY_REVIEWED',
        `This organizer was already ${profile.verificationStatus}.`,
      );
    }

    const status = action === 'approve' ? 'verified' : 'rejected';
    const updated = await organizerRepository.setVerification(organizerId, status, adminId);

    await verificationLogRepository.create({
      adminId,
      targetType: 'organizer',
      targetId: organizerId,
      action: action === 'approve' ? 'approved' : 'rejected',
      notes,
    });

    return toOrganizerDTO(updated);
  },

  // Used by other features (e.g. event creation) to enforce "must be verified".
  async requireVerifiedOrganizer(userId: string): Promise<OrganizerProfile> {
    const profile = await organizerRepository.findByUserId(userId);
    if (!profile) {
      throw new AppError(403, 'NOT_AN_ORGANIZER', 'You need an organizer profile for this.');
    }
    if (profile.verificationStatus !== 'verified') {
      throw new AppError(
        403,
        'ORGANIZER_NOT_VERIFIED',
        'Your organizer account is still under review.',
      );
    }
    return profile;
  },
};
