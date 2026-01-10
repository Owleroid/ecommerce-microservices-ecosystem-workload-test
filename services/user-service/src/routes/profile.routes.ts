import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

export const createProfileRoutes = (profileController: ProfileController): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authenticateToken);

  router.get('/me', profileController.getMe);
  router.patch('/me', profileController.updateMe);

  return router;
};
