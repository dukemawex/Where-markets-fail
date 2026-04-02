import type { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });

export function getCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const key = req.originalUrl;
  const hit = cache.get(key);
  if (hit) {
    res.json(hit);
    return;
  }

  const original = res.json.bind(res);
  res.json = ((body: unknown) => {
    cache.set(key, body);
    return original(body);
  }) as Response['json'];
  next();
}
