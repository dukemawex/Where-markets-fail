import { Router } from 'express';
import { z } from 'zod';
import { getDomainBlindSpots, getDomainCalibration } from '../models/repository';

const router = Router();
const VERSION = '1.0.0';

router.get('/calibration', async (_req, res) => {
  const data = await getDomainCalibration();
  res.json({ data, meta: { computed_at: data[0]?.computed_at ?? new Date().toISOString(), version: VERSION } });
});

router.get('/:domain/blind-spots', async (req, res) => {
  const parsed = z.object({ domain: z.string().min(1) }).safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = await getDomainBlindSpots(parsed.data.domain);
  res.json({ data, meta: { total: data.length, computed_at: new Date().toISOString(), version: VERSION } });
});

export default router;
