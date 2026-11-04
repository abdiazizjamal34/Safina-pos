const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding/updating admin and organization...");

  // 1. Upsert organization so it doesn't fail on duplicate
  const organization = await prisma.organization.upsert({
    where: { name: " Coffee & Restaurant system" }, // Adjust if you have a unique identifier/slug
    update: {},
    create: {
      name: " Coffee & Restaurant system",
    },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const hashedPin = await bcrypt.hash("1234", 10);

  // 2. Upsert user by email to update the PIN / password safely
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {
      pin: hashedPin, // This updates the pin on your existing admin user!
      password: passwordHash,
    },
    create: {
      name: "Administrator",
      email: "admin@test.com",
      password: passwordHash,
      pin: hashedPin,
      role: "ADMIN",
      organizationId: organization.id,
      isActive: true,
    },
  });

  console.log("✅ Admin successfully updated/created with PIN:");
  console.log(`   Email: ${admin.email}`);
  console.log("   Password: Admin@123");
  console.log("   PIN: 1234");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
