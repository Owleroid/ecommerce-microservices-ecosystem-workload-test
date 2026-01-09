import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';

export const createAuthRoutes = (): Router => {
  const router = Router();

  const authProxy = createProxyMiddleware({
    target: config.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/auth': '/auth'
    },
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, _res) => {
      logger.info('Proxied auth request', {
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        target: config.AUTH_SERVICE_URL,
        requestId: (req as any).requestId
      });
    },
    onError: (err, req, res) => {
      logger.error('Auth service proxy error', {
        error: err.message,
        path: req.path,
        requestId: (req as any).requestId
      });

      if (!res.headersSent) {
        res.status(503).json({
          error: {
            message: 'Auth service unavailable',
            statusCode: 503
          }
        });
      }
    }
  });

  router.use('/auth', authProxy);

  return router;
};
