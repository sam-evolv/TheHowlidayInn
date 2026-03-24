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

export const handler = async (event: any, context: any) => {
  const h = await getHandler();
  return h(event, context);
};
