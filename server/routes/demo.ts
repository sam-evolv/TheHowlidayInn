import { Router } from 'express';

const router = Router();

/**
 * GET /demo
 * - set cookie maintenance_bypass
 * - redirect to homepage
 */
router.get('/demo', (req, res) => {
  const token = process.env.MAINTENANCE_BYPASS_TOKEN || 'letmein-123';

  const cookieOptions: any = {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: false,                  // allow front-end to read it
    sameSite: 'Lax',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('maintenance_bypass', token, cookieOptions);
  res.redirect(302, '/');
});

export default router;
