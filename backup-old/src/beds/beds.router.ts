import { Router } from 'express';
import * as bedController from './beds.controller';

const router = Router();

router.post('/', bedController.createBed);
router.get('/', bedController.getBeds);
router.get('/:id', bedController.getBedById);
router.put('/:id', bedController.updateBed);
router.delete('/:id', bedController.deleteBed);

export default router;
