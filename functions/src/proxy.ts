// functions/src/proxy.ts
import { onRequest } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import express from 'express';

const app = express();

function sanitizeSetCookie(setCookieValues: string[] = []) {
  // Remove Domain=..., enforce Path=/; Secure; SameSite=Lax
  return setCookieValues.map((v) => {
    // strip Domain attribute
    let out = v.replace(/;\s*Domain=[^;]+/ig, '');
    // ensure Path
    if (!/;\s*Path=/i.test(out)) out += '; Path=/';
    // ensure Secure
    if (!/;\s*Secure/i.test(out)) out += '; Secure';
    // enforce Lax (avoid third-party requirement)
    out = out.replace(/;\s*SameSite=[^;]+/ig, '');
    out += '; SameSite=Lax';
    return out;
  });
}

app.all('/api/*', async (req, res) => {
  try {
    const base = process.env.REPLIT_BASE;
    if (!base) {
      res.status(500).send('REPLIT_BASE not configured');
      return;
    }

    const target = new URL(req.originalUrl, base).toString();

    // Build headers for upstream
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue;
      const key = k.toLowerCase();
      // Drop hop-by-hop / conflicting headers
      if (['host','content-length','connection','origin'].includes(key)) continue;
      if (Array.isArray(v)) headers[k] = v.join(', '); else headers[k] = String(v);
    }
    // Present origin as our hosting origin
    headers['Origin'] = `https://${req.hostname}`;

    // Read body, if any
    const body = ['GET','HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body && Object.keys(req.body).length
      ? JSON.stringify(req.body)
      : await new Promise<Buffer | undefined>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
        });

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    // Relay status and headers
    res.status(upstream.status);
    upstream.headers.forEach((val: string, key: string) => {
      if (key.toLowerCase() === 'set-cookie') return; // handled below
      res.setHeader(key, val);
    });

    // Rewrite Set-Cookie
    const rawSetCookie = upstream.headers.getSetCookie ? upstream.headers.getSetCookie() : [];
    const rewritten = sanitizeSetCookie(rawSetCookie);
    if (rewritten.length) res.setHeader('Set-Cookie', rewritten);

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err: any) {
    console.error('Proxy error', err);
    res.status(502).send('Upstream error');
  }
});

export const api = onRequest(
  {
    region: 'europe-west1',
    cors: false,
    timeoutSeconds: 60,
    memory: '512MiB'
  },
  app
);
