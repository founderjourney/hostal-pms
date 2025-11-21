import { Request, Response } from 'express';
import * as folioService from './folios.service';

export const createFolio = async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.body;
    const folio = await folioService.createFolio(reservationId);
    res.status(201).json(folio);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the folio.' });
  }
};

export const getFolioById = async (req: Request, res: Response) => {
  try {
    const folio = await folioService.getFolioById(req.params.id);
    if (!folio) {
      return res.status(404).json({ error: 'Folio not found.' });
    }
    res.status(200).json(folio);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the folio.' });
  }
};

export const addCharge = async (req: Request, res: Response) => {
  try {
    const folio = await folioService.addCharge(req.params.id, req.body);
    res.status(200).json(folio);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while adding the charge.' });
  }
};

export const addPayment = async (req: Request, res: Response) => {
  try {
    const folio = await folioService.addPayment(req.params.id, req.body);
    res.status(200).json(folio);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while adding the payment.' });
  }
};
