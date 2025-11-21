import { Request, Response } from 'express';
import * as reservationService from './reservations.service';

export const createReservation = async (req: Request, res: Response) => {
  try {
    const reservation = await reservationService.createReservation(req.body);
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the reservation.' });
  }
};

export const getReservations = async (req: Request, res: Response) => {
  try {
    const reservations = await reservationService.getReservations();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the reservations.' });
  }
};

export const getReservationById = async (req: Request, res: Response) => {
  try {
    const reservation = await reservationService.getReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the reservation.' });
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const reservation = await reservationService.updateReservation(req.params.id, req.body);
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while updating the reservation.' });
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    await reservationService.deleteReservation(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while deleting the reservation.' });
  }
};
