const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:', users.length);
  if (users.length > 0) {
    console.log('First user:', users[0].email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
