import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { AppError } from './errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      requestId: (req as any).requestId,
      stack: err.stack
    });

    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        requestId: (req as any).requestId
      }
    });
  }

  // Unknown error - don't leak details
  logger.error({
    message: 'Internal server error',
    error: err.message,
    stack: err.stack,
    path: req.path,
    requestId: (req as any).requestId
  });

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
      requestId: (req as any).requestId
    }
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.path,
      requestId: (req as any).requestId
    }
  });
};
