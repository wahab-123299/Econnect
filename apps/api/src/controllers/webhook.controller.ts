import { Request, Response } from 'express';
import { webhookService } from '../services/webhook.service';
import { logger } from '../config/logger';

export const webhookController = {
  async paystack(req: Request, res: Response) {
    // req.body is a raw Buffer here — this route is mounted with express.raw(),
    // not express.json(), specifically so the signature can be verified
    // against the exact bytes Paystack sent (see server.ts).
    const rawBody = req.body as Buffer;
    const signature = req.headers['x-paystack-signature'] as string | undefined;

    if (!webhookService.verifySignature(rawBody, signature)) {
      logger.warn('Rejected webhook with invalid Paystack signature');
      res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature.' } });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Malformed JSON.' } });
      return;
    }

    try {
      const result = await webhookService.handlePaystackEvent(payload);
      logger.info(result, 'Processed Paystack webhook');
    } catch (err) {
      // Log and still return 200 — Paystack will retry on non-200, and a
      // processing bug on our end shouldn't cause it to hammer this endpoint
      // indefinitely. The failure is visible in logs for manual follow-up
      // (see docs/ARCHITECTURE.md 3.7 on alerting for payment failures).
      logger.error({ err }, 'Error processing Paystack webhook');
    }

    // Always 200 once the signature is valid and the payload parsed — per
    // Phase 5/3.4: must return fast, and reprocessing logic (idempotency)
    // lives in the service, not in whether we ack the webhook.
    res.status(200).json({ received: true });
  },
};
