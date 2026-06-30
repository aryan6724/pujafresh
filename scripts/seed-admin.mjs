import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@pujafresh.com")
    .trim()
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const fullName = process.env.ADMIN_NAME || "PujaFresh Admin";
  const phone = process.env.ADMIN_PHONE || "9999999999";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      phone,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      fullName,
      email,
      phone,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log("Admin ready:", {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
