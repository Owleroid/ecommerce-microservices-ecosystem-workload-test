import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';

export const createUserRoutes = (): Router => {
  const router = Router();

  const userProxy = createProxyMiddleware({
    target: config.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/users': '/users'
    },
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, _res) => {
      logger.info('Proxied user request', {
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        target: config.USER_SERVICE_URL,
        requestId: (req as any).requestId
      });
    },
    onError: (err, req, res) => {
      logger.error('User service proxy error', {
        error: err.message,
        path: req.path,
        requestId: (req as any).requestId
      });

      if (!res.headersSent) {
        res.status(503).json({
          error: {
            message: 'User service unavailable',
            statusCode: 503
          }
        });
      }
    }
  });

  router.use('/users', userProxy);

  return router;
};
