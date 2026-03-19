import { Router, Request, Response } from 'express';

const router = Router();

// POST /auth/auth/token
// Mock OAuth2 token endpoint — accepts any credentials and returns a dummy token
router.post('/auth/auth/token', (_req: Request, res: Response) => {
  res.json({
    access_token: 'sim-token-' + Date.now(),
    token_type: 'bearer',
    expires_in: 86400,
    scope: 'all',
  });
});

export default router;
