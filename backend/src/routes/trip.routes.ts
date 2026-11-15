import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getTrips,
  createTrip,
  bulkSyncTrips,
  getPODUploadUrl,
  getDashboardStats,
} from '../controllers/trip.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getTrips);
router.post('/', createTrip);
router.post('/bulk-sync', bulkSyncTrips);
router.get('/dashboard-stats', getDashboardStats);
router.get('/:tripId/pod-upload-url', getPODUploadUrl);

export default router;

