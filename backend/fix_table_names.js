const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all tables...');
  const tables = await prisma.table.findMany();
  for (const table of tables) {
    const uppercaseName = table.tableNumber.toUpperCase();
    if (table.tableNumber !== uppercaseName) {
      console.log(`Updating table ${table.tableNumber} -> ${uppercaseName}`);
      await prisma.table.update({
        where: { id: table.id },
        data: { tableNumber: uppercaseName },
      });
    }
  }
  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
