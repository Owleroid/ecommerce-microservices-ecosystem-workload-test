import * as winston from 'winston';

const instanceId = process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'unknown-service',
    instanceId 
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export const createRequestLogger = () => {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    req.requestId = requestId;
    
    // Add instance ID to response headers for tracking
    res.setHeader('X-Instance-ID', instanceId);
    res.setHeader('X-Request-ID', requestId);
    
    logger.info({
      message: 'Incoming request',
      method: req.method,
      path: req.path,
      requestId
    });

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        message: 'Request completed',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId,
        instanceId
      });
    });

    next();
  };
};
