import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createFolio = async (reservationId: string) => {
  const folioNumber = `F-${Date.now()}`;
  return await prisma.folio.create({
    data: {
      reservationId,
      folioNumber,
    },
  });
};

export const getFolioById = async (id: string) => {
  return await prisma.folio.findUnique({ where: { id }, include: { charges: true, payments: true } });
};

export const addCharge = async (folioId: string, data: any) => {
  const { description, amount } = data;

  const charge = await prisma.folioCharge.create({
    data: {
      folioId,
      description,
      totalAmount: amount,
      unitPrice: amount,
      chargeType: 'manual',
    },
  });

  const folio = await prisma.folio.update({
    where: { id: folioId },
    data: {
      totalCharges: { increment: amount },
      balance: { increment: amount },
    },
  });

  return { charge, folio };
};

export const addPayment = async (folioId: string, data: any) => {
  const { amount, paymentMethod } = data;

  const payment = await prisma.payment.create({
    data: {
      folioId,
      amount,
      paymentMethod,
    },
  });

  const folio = await prisma.folio.update({
    where: { id: folioId },
    data: {
      totalPayments: { increment: amount },
      balance: { decrement: amount },
    },
  });

  return { payment, folio };
};
