import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../models/profile.model';
import { logger } from 'service-common';

export class ProfileController {
  constructor(private profileService: ProfileService) {}

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const profile = await this.profileService.getProfile(userId);

      logger.info('Profile retrieved', { 
        userId,
        requestId: (req as any).requestId 
      });

      res.status(200).json({
        profile
      });
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const dto: UpdateProfileDto = req.body;

      const profile = await this.profileService.updateProfile(userId, dto);

      logger.info('Profile updated', { 
        userId,
        requestId: (req as any).requestId 
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        profile
      });
    } catch (error) {
      next(error);
    }
  };
}
