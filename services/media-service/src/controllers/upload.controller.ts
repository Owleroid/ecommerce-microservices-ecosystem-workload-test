import { Request, Response, NextFunction } from 'express';
import { UploadService } from '../services/upload.service';
import { logger } from 'service-common';

export class UploadController {
  constructor(private uploadService: UploadService) {}

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        return next(new Error('No file uploaded'));
      }

      const result = await this.uploadService.uploadAvatar(userId, file);

      logger.info('Avatar upload initiated', {
        userId,
        jobId: result.jobId,
        requestId: (req as any).requestId
      });

      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  };

  getJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;
      const status = await this.uploadService.getJobStatus(jobId);

      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  };
}
