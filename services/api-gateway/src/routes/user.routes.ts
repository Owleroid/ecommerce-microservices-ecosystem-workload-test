import { Router } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { logger } from 'service-common';
import { config } from '../config/env';
import { ServiceLoadBalancer } from '../utils/load-balancer';

export const createUserRoutes = (): Router => {
  const router = Router();

  // Initialize load balancer for user service
  const userLoadBalancer = new ServiceLoadBalancer(config.USER_SERVICE_URL);

  const userProxy = createProxyMiddleware({
    target: userLoadBalancer.getNext(),
    changeOrigin: true,
    pathRewrite: {
      '^/users': '/users'
    },
    router: (req) => {
      // Get next target for each request (round-robin)
      const target = userLoadBalancer.getNext();
      logger.debug('Routing user request', {
        method: req.method,
        path: req.path,
        target,
        requestId: (req as any).requestId
      });
      return target;
    },
    onProxyReq: fixRequestBody,
    onProxyRes: (proxyRes, req, _res) => {
      logger.info('Proxied user request', {
        method: req.method,
        path: req.path,
        statusCode: proxyRes.statusCode,
        instanceId: proxyRes.headers['x-instance-id'],
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
