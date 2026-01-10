import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { CreateUserDto, LoginDto } from '../models/user.model';
import { logger } from 'service-common';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: CreateUserDto = req.body;
      const user = await this.authService.register(dto);

      logger.info('User registered', { 
        userId: user.id, 
        email: user.email,
        requestId: (req as any).requestId 
      });

      res.status(201).json({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: LoginDto = req.body;
      const tokens = await this.authService.login(dto);

      logger.info('User logged in', { 
        email: dto.email,
        requestId: (req as any).requestId 
      });

      res.status(200).json({
        message: 'Login successful',
        ...tokens
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return next(new Error('Refresh token is required'));
      }

      const accessToken = await this.authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        message: 'Token refreshed',
        accessToken
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return next(new Error('User not authenticated'));
      }

      await this.authService.logout(userId);

      logger.info('User logged out', { 
        userId,
        requestId: (req as any).requestId 
      });

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  };
}
