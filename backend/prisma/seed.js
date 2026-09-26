const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin only...');

  const organization = await prisma.organization.create({
    data: {
      name: 'Safina Coffee & Restaurant',
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'admin@safina.com',
      password: passwordHash,
      role: 'ADMIN',
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log('✅ Admin created:');
  console.log(`   Email: ${admin.email}`);
  console.log('   Password: Admin@123');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });