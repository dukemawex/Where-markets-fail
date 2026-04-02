import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getCacheMiddleware } from './middleware/cache';
import { apiRateLimiter } from './middleware/rateLimiter';
import domainsRouter from './routes/domains';
import forecastersRouter from './routes/forecasters';
import questionsRouter from './routes/questions';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.NEXT_PUBLIC_FRONTEND_URL ?? '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('combined'));
  app.use(apiRateLimiter);
  app.use(getCacheMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok' }, meta: { computed_at: new Date().toISOString(), version: '1.0.0' } });
  });

  app.use('/api/questions', questionsRouter);
  app.use('/api/domains', domainsRouter);
  app.use('/api/forecaster', forecastersRouter);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT ?? 8080);
  app.listen(port, () => {
    console.log(`API listening on ${port}`);
  });
}
