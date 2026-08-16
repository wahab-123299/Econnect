import { ticketRepository } from '../repositories/ticket.repository';

export const ticketService = {
  async getMyTickets(userId: string) {
    const tickets = await ticketRepository.findByOwnerUserId(userId);

    return tickets.map((t) => ({
      id: t.id,
      status: t.status,
      qrSignature: t.qrSignature,
      checkedInAt: t.checkedInAt,
      event: {
        id: t.ticketTier.event.id,
        title: t.ticketTier.event.title,
        startDatetime: t.ticketTier.event.startDatetime,
        locationName: t.ticketTier.event.locationName,
        flyerUrl: t.ticketTier.event.flyerUrl,
      },
      ticketTier: {
        name: t.ticketTier.name,
        priceKobo: t.ticketTier.priceKobo.toString(),
      },
    }));
  },
};
