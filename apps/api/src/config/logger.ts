import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});
