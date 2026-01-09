import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';

export const createMediaRoutes = (): Router => {
  const router = Router();

  const mediaProxy = createProxyMiddleware({
    target: config.MEDIA_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/media': '/media'
    },
    onProxyReq: (_proxyReq, req) => {
      // For multipart uploads, don't try to fix body
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        return;
      }
    },
    onProxyRes: (proxyRes, req, _res) => {
      logger.info('Proxied media request', {
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        target: config.MEDIA_SERVICE_URL,
        requestId: (req as any).requestId
      });
    },
    onError: (err, req, res) => {
      logger.error('Media service proxy error', {
        error: err.message,
        path: req.path,
        requestId: (req as any).requestId
      });

      if (!res.headersSent) {
        res.status(503).json({
          error: {
            message: 'Media service unavailable',
            statusCode: 503
          }
        });
      }
    }
  });

  router.use('/media', mediaProxy);

  return router;
};
