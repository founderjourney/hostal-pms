import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as authController from './auth/auth.controller';
import { authenticate, authorize, AuthenticatedRequest } from './auth/auth.middleware';
import guestsRouter from './guests/guests.router';
import productsRouter from './products/products.router';
import bedsRouter from './beds/beds.router';
import reservationsRouter from './reservations/reservations.router';
import foliosRouter from './folios/folios.router';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

app.use('/guests', authenticate, guestsRouter);
app.use('/products', authenticate, productsRouter);
app.use('/beds', authenticate, bedsRouter);
app.use('/reservations', authenticate, reservationsRouter);
app.use('/folios', authenticate, foliosRouter);

app.get('/profile', authenticate, (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

app.get('/admin', authenticate, authorize('admin'), (req: AuthenticatedRequest, res) => {
  res.json({ message: 'Welcome admin!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
