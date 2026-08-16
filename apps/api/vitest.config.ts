import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      QR_SIGNING_SECRET: 'test-qr-secret',
      PAYSTACK_SECRET_KEY: 'sk_test_fake',
    },
  },
});
