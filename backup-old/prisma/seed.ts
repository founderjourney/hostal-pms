import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // --- Seed Users ---
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@almanik.com' },
    update: {},
    create: {
      email: 'admin@almanik.com',
      username: 'admin',
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
  });

  const receptionUser = await prisma.user.upsert({
    where: { email: 'reception@almanik.com' },
    update: {},
    create: {
      email: 'reception@almanik.com',
      username: 'reception',
      passwordHash: passwordHash,
      firstName: 'Reception',
      lastName: 'User',
      role: 'reception',
      isActive: true,
    },
  });

  const volunteerUser = await prisma.user.upsert({
    where: { email: 'volunteer@almanik.com' },
    update: {},
    create: {
      email: 'volunteer@almanik.com',
      username: 'volunteer',
      passwordHash: passwordHash,
      firstName: 'Volunteer',
      lastName: 'User',
      role: 'volunteer',
      isActive: true,
    },
  });

  console.log('Seeded users:', { adminUser, receptionUser, volunteerUser });

  // --- Seed Room Types ---
  const privateRoom = await prisma.roomType.upsert({
    where: { name: 'Private Room' },
    update: {},
    create: {
      name: 'Private Room',
      bedsCount: 1,
      maxOccupancy: 2,
      basePrice: 50.00,
      description: 'A private room with a double bed.',
    },
  });

  const dorm4Bed = await prisma.roomType.upsert({
    where: { name: '4-Bed Mixed Dorm' },
    update: {},
    create: {
      name: '4-Bed Mixed Dorm',
      bedsCount: 4,
      maxOccupancy: 4,
      basePrice: 25.00,
      description: 'A shared dormitory with 4 beds.',
    },
  });
  
  console.log('Seeded room types:', { privateRoom, dorm4Bed });

  // --- Seed Products ---
  const water = await prisma.product.upsert({
      where: { name: 'Water Bottle' },
      update: {},
      create: {
          name: 'Water Bottle',
          category: 'Drinks',
          salePrice: 2.00,
          currentStock: 100,
      }
  });

  const towel = await prisma.product.upsert({
      where: { name: 'Towel Rental' },
      update: {},
      create: {
          name: 'Towel Rental',
          category: 'Services',
          salePrice: 5.00,
          currentStock: 50,
      }
  });

  console.log('Seeded products:', { water, towel });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
