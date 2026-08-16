import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/tickets', requireAuth, ticketController.getMyTickets);

export default router;
