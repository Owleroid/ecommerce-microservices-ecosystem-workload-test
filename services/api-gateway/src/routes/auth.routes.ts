import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';
import { ServiceLoadBalancer } from '../utils/load-balancer';

export const createAuthRoutes = (): Router => {
  const router = Router();

  // Initialize load balancer for auth service
  const authLoadBalancer = new ServiceLoadBalancer(config.AUTH_SERVICE_URL);

  const authProxy = createProxyMiddleware({
    target: authLoadBalancer.getNext(),
    changeOrigin: true,
    pathRewrite: {
      '^/auth': '/auth'
    },
    router: (req) => {
      // Get next target for each request (round-robin)
      const target = authLoadBalancer.getNext();
      logger.debug('Routing auth request', {
        method: req.method,
        path: req.path,
        target,
        requestId: (req as any).requestId
      });
      return target;
    },
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, _res) => {
      logger.info('Proxied auth request', {
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        instanceId: proxyRes.headers['x-instance-id'],
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
