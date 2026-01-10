import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';
import { ServiceLoadBalancer } from '../utils/load-balancer';

export const createMediaRoutes = (): Router => {
  const router = Router();

  // Initialize load balancer for media service
  const mediaLoadBalancer = new ServiceLoadBalancer(config.MEDIA_SERVICE_URL);

  const mediaProxy = createProxyMiddleware({
    target: mediaLoadBalancer.getNext(),
    changeOrigin: true,
    pathRewrite: {
      '^/media': '/media'
    },
    router: (req) => {
      // Get next target for each request (round-robin)
      const target = mediaLoadBalancer.getNext();
      logger.debug('Routing media request', {
        method: req.method,
        path: req.path,
        target,
        requestId: (req as any).requestId
      });
      return target;
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
        instanceId: proxyRes.headers['x-instance-id'],
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
