import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './config/logger';
import { assertRequiredEnvVars } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import organizerRoutes from './routes/organizer.routes';
import adminRoutes from './routes/admin.routes';
import organizerEventsRoutes from './routes/organizer-events.routes';
import publicEventsRoutes from './routes/public-events.routes';
import orderRoutes from './routes/order.routes';
import webhookRoutes from './routes/webhook.routes';
import meRoutes from './routes/me.routes';
import publicVenuesRoutes from './routes/public-venues.routes';
import organizerVenueBookingsRoutes from './routes/organizer-venue-bookings.routes';

assertRequiredEnvVars();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(helmet());
app.use(cors());
app.use(pinoHttp({ logger }));

// Webhook routes need the RAW request body to verify Paystack's signature —
// mounted here, with express.raw(), before the global express.json() below
// ever gets a chance to parse (and thus alter) the bytes. This ordering is
// load-bearing: swap it and signature verification breaks silently.
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizers', organizerRoutes);
app.use('/api/v1/organizers/events', organizerEventsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/events', publicEventsRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/me', meRoutes);
app.use('/api/v1/venues', publicVenuesRoutes);
app.use('/api/v1/organizers/venue-bookings', organizerVenueBookingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Econnect API listening on port ${PORT}`);
});

export default app;
