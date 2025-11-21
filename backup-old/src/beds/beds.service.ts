import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createBed = async (data: any) => {
  return await prisma.bed.create({ data });
};

export const getBeds = async () => {
  return await prisma.bed.findMany();
};

export const getBedById = async (id: string) => {
  return await prisma.bed.findUnique({ where: { id } });
};

export const updateBed = async (id: string, data: any) => {
  return await prisma.bed.update({
    where: { id },
    data,
  });
};

export const deleteBed = async (id: string) => {
  return await prisma.bed.delete({ where: { id } });
};
