import serverless from 'serverless-http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../../server/routes';

let _handler: ReturnType<typeof serverless> | null = null;

async function getHandler() {
  if (!_handler) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    await registerRoutes(app);
    _handler = serverless(app);
  }
  return _handler;
}

// The Netlify redirect delivers paths as /.netlify/functions/api/settings/…
// Express routes are defined as /api/settings/… so we rewrite the prefix.
const FUNCTION_BASE = '/.netlify/functions/api';

function normalizePath(event: any): void {
  // Rewrite /.netlify/functions/api<rest> → /api<rest>
  // Works for both Netlify v1 (event.path) and v2 (event.rawPath / event.rawUrl)
  for (const key of ['path', 'rawPath'] as const) {
    const val: string | undefined = event[key];
    if (val?.startsWith(FUNCTION_BASE)) {
      event[key] = '/api' + val.slice(FUNCTION_BASE.length);
    }
  }
  if (typeof event.rawUrl === 'string' && event.rawUrl.includes(FUNCTION_BASE)) {
    event.rawUrl = event.rawUrl.replace(FUNCTION_BASE, '/api');
  }
}

export const handler = async (event: any, context: any) => {
  normalizePath(event);
  const h = await getHandler();
  return h(event, context);
};
