import { Request, Response, NextFunction } from 'express';
import { scanService } from '../services/scan.service';

export const scanController = {
  async scan(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await scanService.scanTicket(
        req.params.id,
        req.user!.id,
        req.body.qrSignature,
      );
      // Always 200 for a well-formed, authorized scan request — valid vs.
      // invalid vs. already-used are all normal outcomes the door UI reacts
      // to inline (green/red flash), not HTTP-level error states. Actual
      // errors (event not found, not your event) are thrown above and
      // handled by the global error handler as 404/403.
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
