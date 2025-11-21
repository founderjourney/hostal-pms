import { Router } from 'express';
import * as guestController from './guests.controller';

const router = Router();

router.post('/', guestController.createGuest);
router.get('/', guestController.getGuests);
router.get('/:id', guestController.getGuestById);
router.put('/:id', guestController.updateGuest);
router.delete('/:id', guestController.deleteGuest);

export default router;
