import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createProduct = async (data: any) => {
  return await prisma.product.create({ data });
};

export const getProducts = async () => {
  return await prisma.product.findMany();
};

export const getProductById = async (id: string) => {
  return await prisma.product.findUnique({ where: { id } });
};

export const updateProduct = async (id: string, data: any) => {
  return await prisma.product.update({
    where: { id },
    data,
  });
};

export const deleteProduct = async (id: string) => {
  return await prisma.product.delete({ where: { id } });
};
