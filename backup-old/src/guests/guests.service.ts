import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createGuest = async (data: any) => {
  return await prisma.guest.create({ data });
};

export const getGuests = async () => {
  return await prisma.guest.findMany();
};

export const getGuestById = async (id: string) => {
  return await prisma.guest.findUnique({ where: { id } });
};

export const updateGuest = async (id: string, data: any) => {
  return await prisma.guest.update({
    where: { id },
    data,
  });
};

export const deleteGuest = async (id: string) => {
  return await prisma.guest.delete({ where: { id } });
};
