const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin only...');

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // add pin in addmin user
  const hashedPin = await bcrypt.hash('1234', 10); 

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    create: {
      name: 'Administrator',
      email: 'admin@test.com',
      password: passwordHash,
      pin: hashedPin, // Store the hashed PIN
      role: 'ADMIN',
      isActive: true,
      organization: {
        create: {
          name: ' Coffee & Restaurant system',
        },
      },
    },
    update: {
      name: 'Administrator',
      password: passwordHash,
      pin: hashedPin,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin created:');
  console.log(`   Email: ${admin.email}`);
  console.log('   Password: Admin@123');
  console.log(`   PIN: ${hashedPin}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });