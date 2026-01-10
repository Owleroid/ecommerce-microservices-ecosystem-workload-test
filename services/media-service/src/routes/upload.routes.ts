import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { config } from '../config/env';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(config.MAX_FILE_SIZE)
  }
});

export const createUploadRoutes = (uploadController: UploadController): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  router.post('/avatar', upload.single('avatar'), uploadController.uploadAvatar);
  router.get('/jobs/:jobId', uploadController.getJobStatus);

  return router;
};
