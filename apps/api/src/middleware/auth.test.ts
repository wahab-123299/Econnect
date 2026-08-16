import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAuth, requireRole } from './auth';
import { errorHandler } from './error-handler';
import { signAccessToken } from '../utils/tokens';

// A minimal app exercising the middleware in isolation, independent of any
// real feature routes or the database — keeps this test fast and focused on
// exactly what Issue #6 is responsible for.
function buildTestApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ userId: req.user!.id, role: req.user!.role });
  });
  app.post('/organizer-only', requireAuth, requireRole('organizer'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('requireAuth', () => {
  const app = buildTestApp();

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token and attaches req.user', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'attendee' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'user-1', role: 'attendee' });
  });
});

describe('requireRole', () => {
  const app = buildTestApp();

  it('rejects a wrong-role user with 403', async () => {
    const token = signAccessToken({ sub: 'user-1', role: 'attendee' });
    const res = await request(app)
      .post('/organizer-only')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a matching-role user through', async () => {
    const token = signAccessToken({ sub: 'user-2', role: 'organizer' });
    const res = await request(app)
      .post('/organizer-only')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
