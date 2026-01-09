import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from 'service-common';
import { config } from '../config/env';
import { JwtPayload } from '../models/profile.model';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new UnauthorizedError('Access token is required'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    if (decoded.type !== 'access') {
      return next(new UnauthorizedError('Invalid token type'));
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    return next(new UnauthorizedError('Invalid token'));
  }
};
