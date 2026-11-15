import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getParties, createParty, bulkSyncParties } from '../controllers/party.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getParties);
router.post('/', createParty);
router.post('/bulk-sync', bulkSyncParties);

export default router;

