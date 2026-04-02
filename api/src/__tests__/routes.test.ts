import request from 'supertest';
import { createApp } from '../index';

const app = createApp();

describe('API routes', () => {
  it('GET /health returns status JSON', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.meta.version).toBeDefined();
  });

  it('GET /api/questions/flagged returns valid JSON', async () => {
    const res = await request(app).get('/api/questions/flagged?limit=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeDefined();
  });

  it('GET /api/questions/:id/audit returns audit payload', async () => {
    const res = await request(app).get('/api/questions/1/audit');
    expect(res.status).toBe(200);
    expect(res.body.data.question).toBeDefined();
  });

  it('GET /api/questions/:id/forecast-history returns points', async () => {
    const res = await request(app).get('/api/questions/1/forecast-history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/domains/calibration returns valid JSON', async () => {
    const res = await request(app).get('/api/domains/calibration');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/domains/:domain/blind-spots returns payload', async () => {
    const res = await request(app).get('/api/domains/geopolitics/blind-spots');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/forecaster/:username/blind-spots returns profile', async () => {
    const res = await request(app).get('/api/forecaster/alice/blind-spots');
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
  });
});
