import { Router } from 'express';
import { z } from 'zod';
import { getAudit, getFlagged, getForecastHistory } from '../models/repository';

const router = Router();
const VERSION = '1.0.0';

router.get('/flagged', async (req, res) => {
  const parsed = z
    .object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      domain: z.string().optional(),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await getFlagged(parsed.data.limit, parsed.data.domain);
  res.json({
    data,
    meta: {
      total: data.length,
      computed_at: data[0]?.computed_at ?? new Date().toISOString(),
      version: VERSION,
    },
  });
});

router.get('/:id/audit', async (req, res) => {
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await getAudit(parsed.data.id);
  res.json({ data, meta: { computed_at: new Date().toISOString(), version: VERSION } });
});

router.get('/:id/forecast-history', async (req, res) => {
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = await getForecastHistory(parsed.data.id);
  res.json({ data, meta: { question_id: parsed.data.id, computed_at: new Date().toISOString(), version: VERSION } });
});

export default router;
