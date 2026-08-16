import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}));
vi.mock('../repositories/organizer.repository', () => ({
  organizerRepository: {
    findById: vi.fn(),
    setVerification: vi.fn(),
    findByUserId: vi.fn(),
    listByStatus: vi.fn(),
  },
}));
vi.mock('../repositories/verification-log.repository', () => ({
  verificationLogRepository: { create: vi.fn() },
}));

import { organizerService } from './organizer.service';
import { organizerRepository } from '../repositories/organizer.repository';
import { verificationLogRepository } from '../repositories/verification-log.repository';

const mockedRepo = vi.mocked(organizerRepository);
const mockedLog = vi.mocked(verificationLogRepository);

const basePendingProfile = {
  id: 'org-1',
  userId: 'user-1',
  businessName: 'Test Events Co',
  verificationStatus: 'pending' as const,
  verifiedAt: null,
  verifiedBy: null,
  createdAt: new Date(),
};

describe('organizerService.verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves a pending organizer and logs the action', async () => {
    mockedRepo.findById.mockResolvedValue(basePendingProfile);
    mockedRepo.setVerification.mockResolvedValue({
      ...basePendingProfile,
      verificationStatus: 'verified',
    });

    const result = await organizerService.verify('org-1', 'admin-1', 'approve', 'looks good');

    expect(result.verificationStatus).toBe('verified');
    expect(mockedRepo.setVerification).toHaveBeenCalledWith('org-1', 'verified', 'admin-1');
    expect(mockedLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approved', targetId: 'org-1', targetType: 'organizer' }),
    );
  });

  it('rejects a pending organizer', async () => {
    mockedRepo.findById.mockResolvedValue(basePendingProfile);
    mockedRepo.setVerification.mockResolvedValue({
      ...basePendingProfile,
      verificationStatus: 'rejected',
    });

    const result = await organizerService.verify('org-1', 'admin-1', 'reject');

    expect(result.verificationStatus).toBe('rejected');
    expect(mockedLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'rejected' }),
    );
  });

  it('refuses to re-review an already-verified organizer', async () => {
    mockedRepo.findById.mockResolvedValue({
      ...basePendingProfile,
      verificationStatus: 'verified',
    });

    await expect(organizerService.verify('org-1', 'admin-1', 'approve')).rejects.toMatchObject({
      code: 'ALREADY_REVIEWED',
    });
    expect(mockedRepo.setVerification).not.toHaveBeenCalled();
  });

  it('404s on an unknown organizer id', async () => {
    mockedRepo.findById.mockResolvedValue(null);

    await expect(organizerService.verify('missing', 'admin-1', 'approve')).rejects.toMatchObject({
      code: 'ORGANIZER_PROFILE_NOT_FOUND',
    });
  });
});

describe('organizerService.requireVerifiedOrganizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_AN_ORGANIZER when no profile exists', async () => {
    mockedRepo.findByUserId.mockResolvedValue(null);
    await expect(organizerService.requireVerifiedOrganizer('user-1')).rejects.toMatchObject({
      code: 'NOT_AN_ORGANIZER',
    });
  });

  it('throws ORGANIZER_NOT_VERIFIED when still pending', async () => {
    mockedRepo.findByUserId.mockResolvedValue(basePendingProfile);
    await expect(organizerService.requireVerifiedOrganizer('user-1')).rejects.toMatchObject({
      code: 'ORGANIZER_NOT_VERIFIED',
    });
  });

  it('returns the profile when verified', async () => {
    mockedRepo.findByUserId.mockResolvedValue({
      ...basePendingProfile,
      verificationStatus: 'verified',
    });
    const result = await organizerService.requireVerifiedOrganizer('user-1');
    expect(result.id).toBe('org-1');
  });
});
