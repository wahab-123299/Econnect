import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.mjs <email>');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  });
  console.log(`Done: ${user.email} is now ${user.role}`);
} catch (e) {
  if (e.code === 'P2025') {
    console.error(`No user found with email ${email}. Register that account in the app first, then rerun.`);
  } else {
    console.error(e.message);
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}