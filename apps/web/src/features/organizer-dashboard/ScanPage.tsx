import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '../../lib/auth-context';

type ScanOutcome =
  | { valid: true; attendeeName: string; ticketTierName: string }
  | { valid: false; reason: string; checkedInAt?: string };

// Scan-then-cooldown, not continuous scanning — without a cooldown the same
// QR code would fire dozens of scan requests per second while held in frame,
// hammering the API and re-triggering the flash animation nonstop.
const SCAN_COOLDOWN_MS = 2500;

export default function ScanPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningLockedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanOutcome | null>(null);
  const [flash, setFlash] = useState<'none' | 'green' | 'red'>('none');

  const submitScan = useCallback(
    async (qrSignature: string) => {
      if (!eventId) return;
      try {
        const res = await authFetch(`/organizers/events/${eventId}/scan`, {
          method: 'POST',
          body: JSON.stringify({ qrSignature }),
        });
        const body: ScanOutcome = await res.json();
        setLastResult(body);
        setFlash(body.valid ? 'green' : 'red');
      } catch {
        setLastResult({ valid: false, reason: 'NETWORK_ERROR' });
        setFlash('red');
      } finally {
        setTimeout(() => setFlash('none'), 600);
        setTimeout(() => {
          scanningLockedRef.current = false;
        }, SCAN_COOLDOWN_MS);
      }
    },
    [authFetch, eventId],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setCameraError('Camera access is required to scan tickets. Please allow camera permission.');
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && !scanningLockedRef.current) {
            scanningLockedRef.current = true;
            submitScan(code.data);
          }
        }
      }
      animationFrame = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [submitScan]);

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay — large, high-contrast, readable outdoors at a door in low light */}
      {flash !== 'none' && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            flash === 'green' ? 'bg-green-600/90' : 'bg-red-600/90'
          }`}
        >
          <span className="text-6xl">{flash === 'green' ? '✓' : '✕'}</span>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black">
          <p>{cameraError}</p>
        </div>
      )}

      {lastResult && flash === 'none' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white text-black p-4">
          {lastResult.valid ? (
            <>
              <p className="text-lg font-semibold">{lastResult.attendeeName}</p>
              <p className="text-sm text-gray-500">{lastResult.ticketTierName}</p>
            </>
          ) : (
            <p className="text-lg font-semibold text-red-600">
              {lastResult.reason === 'ALREADY_USED' && 'Already used'}
              {lastResult.reason === 'WRONG_EVENT' && 'Wrong event'}
              {lastResult.reason === 'INVALID_TICKET' && 'Invalid ticket'}
              {lastResult.reason === 'NETWORK_ERROR' && 'Network error — try again'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
