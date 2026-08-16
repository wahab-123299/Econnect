import { ticketRepository } from '../repositories/ticket.repository';
import { eventRepository } from '../repositories/event.repository';
import { organizerService } from './organizer.service';
import { verifyQrSignature } from '../utils/qr-ticket';
import { AppError } from '../middleware/error-handler';

type ScanResult =
  | { valid: true; attendeeName: string; ticketTierName: string }
  | { valid: false; reason: 'INVALID_TICKET' | 'WRONG_EVENT' | 'ALREADY_USED'; checkedInAt?: Date };

export const scanService = {
  async scanTicket(eventId: string, organizerUserId: string, qrSignature: string): Promise<ScanResult> {
    // Ownership of the EVENT is checked first and is a hard failure (throws)
    // — an organizer attempting to scan for an event they don't own is a
    // permissions violation, not a "bad scan" the door UI should soft-fail
    // on. Everything after this point is a normal scan outcome (valid,
    // already used, wrong event, forged) that the scanner UI needs to
    // render inline with a flash/color, not an exception.
    const event = await eventRepository.findByIdForOwnerCheck(eventId);
    if (!event) {
      throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found.');
    }
    const organizerProfile = await organizerService.getMyProfile(organizerUserId).catch(() => null);
    if (!organizerProfile || event.organizerId !== organizerProfile.id) {
      throw new AppError(403, 'NOT_EVENT_OWNER', 'You do not own this event.');
    }

    const sig = verifyQrSignature(qrSignature);
    if (!sig.valid || !sig.ticketId) {
      return { valid: false, reason: 'INVALID_TICKET' };
    }

    const ticket = await ticketRepository.findForScan(sig.ticketId);
    if (!ticket) {
      return { valid: false, reason: 'INVALID_TICKET' };
    }
    if (ticket.ticketTier.event.id !== eventId) {
      return { valid: false, reason: 'WRONG_EVENT' };
    }

    const checkedIn = await ticketRepository.checkIn(ticket.id, organizerUserId);
    if (!checkedIn) {
      // Lost the race (or was already scanned earlier) — re-read for the
      // real check-in time rather than reporting "now".
      const current = await ticketRepository.findByQrSignature(qrSignature);
      return { valid: false, reason: 'ALREADY_USED', checkedInAt: current?.checkedInAt ?? undefined };
    }

    return {
      valid: true,
      attendeeName: ticket.owner.fullName,
      ticketTierName: ticket.ticketTier.name,
    };
  },
};
