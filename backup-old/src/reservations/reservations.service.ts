import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createReservation = async (data: any) => {
  const { bedId, checkIn, checkOut } = data;

  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      bedId,
      AND: [
        {
          checkIn: {
            lt: checkOut,
          },
        },
        {
          checkOut: {
            gt: checkIn,
          },
        },
      ],
    },
  });

  if (overlappingReservations.length > 0) {
    throw new Error('Bed is not available for the selected dates.');
  }

  return await prisma.reservation.create({ data });
};

export const getReservations = async () => {
  return await prisma.reservation.findMany();
};

export const getReservationById = async (id: string) => {
  return await prisma.reservation.findUnique({ where: { id } });
};

export const updateReservation = async (id: string, data: any) => {
  return await prisma.reservation.update({
    where: { id },
    data,
  });
};

export const deleteReservation = async (id: string) => {
  return await prisma.reservation.delete({ where: { id } });
};
