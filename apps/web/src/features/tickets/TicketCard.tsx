import type { TicketDTO } from '@econnect/shared-types';

interface Props {
  ticket: TicketDTO;
  onClick: () => void;
}

export default function TicketCard({ ticket, onClick }: Props) {
  const isPast = new Date(ticket.event.startDatetime).getTime() < Date.now();

  return (
    <button
      onClick={onClick}
      className="w-full text-left border rounded-lg overflow-hidden flex hover:shadow-md transition-shadow"
    >
      <div className="w-24 h-24 bg-gray-100 shrink-0">
        {ticket.event.flyerUrl ? (
          <img
            src={ticket.event.flyerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>
      <div className="p-3 flex-1 min-w-0">
        <p className="font-semibold truncate">{ticket.event.title}</p>
        <p className="text-sm text-gray-500">
          {new Date(ticket.event.startDatetime).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <p className="text-sm text-gray-500 truncate">{ticket.ticketTier.name}</p>
        {ticket.status === 'used' && (
          <span className="text-xs text-gray-400">Checked in</span>
        )}
        {isPast && ticket.status === 'unused' && (
          <span className="text-xs text-gray-400">Past event</span>
        )}
      </div>
    </button>
  );
}
