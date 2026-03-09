import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.ADMIN_EMAIL    ?? "admin@cedcasproperties.com";
  const password = process.env.ADMIN_PASSWORD ?? "CedCas@2026!";
  const name     = process.env.ADMIN_NAME     ?? "CedCas Admin";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { email, password: hashed, name } });
  console.log(`✅ Admin user created: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   ⚠️  Change this password after first login!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
