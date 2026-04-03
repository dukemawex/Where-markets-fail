import { Router } from 'express';
import { z } from 'zod';
import { getForecasterBlindSpots } from '../models/repository';

const router = Router();
const VERSION = '1.0.0';

router.get('/:username/blind-spots', async (req, res) => {
  const parsed = z.object({ username: z.string().min(1) }).safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await getForecasterBlindSpots(parsed.data.username);
  res.json({ data, meta: { computed_at: new Date().toISOString(), version: VERSION } });
});

export default router;
