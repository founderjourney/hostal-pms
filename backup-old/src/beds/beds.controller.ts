import { Request, Response } from 'express';
import * as bedService from './beds.service';

export const createBed = async (req: Request, res: Response) => {
  try {
    const bed = await bedService.createBed(req.body);
    res.status(201).json(bed);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while creating the bed.' });
  }
};

export const getBeds = async (req: Request, res: Response) => {
  try {
    const beds = await bedService.getBeds();
    res.status(200).json(beds);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the beds.' });
  }
};

export const getBedById = async (req: Request, res: Response) => {
  try {
    const bed = await bedService.getBedById(req.params.id);
    if (!bed) {
      return res.status(404).json({ error: 'Bed not found.' });
    }
    res.status(200).json(bed);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while retrieving the bed.' });
  }
};

export const updateBed = async (req: Request, res: Response) => {
  try {
    const bed = await bedService.updateBed(req.params.id, req.body);
    res.status(200).json(bed);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while updating the bed.' });
  }
};

export const deleteBed = async (req: Request, res: Response) => {
  try {
    await bedService.deleteBed(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while deleting the bed.' });
  }
};
