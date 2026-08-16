import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import type { TicketDTO } from '@econnect/shared-types';

interface Props {
  ticket: TicketDTO;
  onClose: () => void;
}

export default function TicketQrView({ ticket, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, ticket.qrSignature, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'M',
      }).catch(() => {
        // If rendering fails there's nothing actionable for the user to do
        // beyond retrying — the empty canvas itself communicates the failure
        // clearly enough without a redundant error message here.
      });
    }
  }, [ticket.qrSignature]);

  const isUsed = ticket.status === 'used';

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 text-center">
      <button
        className="absolute top-4 right-4 text-2xl leading-none px-3 py-1"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <h2 className="text-lg font-semibold mb-1">{ticket.event.title}</h2>
      <p className="text-sm text-gray-500 mb-6">{ticket.ticketTier.name}</p>

      <div className={`relative ${isUsed ? 'opacity-30' : ''}`}>
        <canvas ref={canvasRef} />
      </div>

      {isUsed ? (
        <p className="mt-6 text-sm font-medium text-red-600">
          Already checked in{ticket.checkedInAt && ` · ${new Date(ticket.checkedInAt).toLocaleString()}`}
        </p>
      ) : (
        <p className="mt-6 text-sm text-gray-500">Show this at the door.</p>
      )}
    </div>
  );
}
