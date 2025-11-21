import { Router } from 'express';
import * as folioController from './folios.controller';

const router = Router();

router.post('/', folioController.createFolio);
router.get('/:id', folioController.getFolioById);
router.post('/:id/charges', folioController.addCharge);
router.post('/:id/payments', folioController.addPayment);

export default router;
