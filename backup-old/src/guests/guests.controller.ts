import { Request, Response } from 'express';
import * as guestService from './guests.service';

export const createGuest = async (req: Request, res: Response) => {
  try {
    const guest = await guestService.createGuest(req.body);
    res.status(201).json(guest);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the guest.' });
  }
};

export const getGuests = async (req: Request, res: Response) => {
  try {
    const guests = await guestService.getGuests();
    res.status(200).json(guests);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the guests.' });
  }
};

export const getGuestById = async (req: Request, res: Response) => {
  try {
    const guest = await guestService.getGuestById(req.params.id);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found.' });
    }
    res.status(200).json(guest);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the guest.' });
  }
};

export const updateGuest = async (req: Request, res: Response) => {
  try {
    const guest = await guestService.updateGuest(req.params.id, req.body);
    res.status(200).json(guest);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while updating the guest.' });
  }
};

export const deleteGuest = async (req: Request, res: Response) => {
  try {
    await guestService.deleteGuest(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while deleting the guest.' });
  }
};
