import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getInvoices, createInvoice } from '../controllers/invoice.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getInvoices);
router.post('/', createInvoice);

export default router;

