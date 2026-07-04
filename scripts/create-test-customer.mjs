import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "testcustomer2@gmail.com";
  const password = "Test@12345";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      fullName: "Test Customer",
      phone: "9999999998",
      passwordHash,
      role: "CUSTOMER",
      isActive: true,
    },
    create: {
      fullName: "Test Customer",
      email,
      phone: "9999999998",
      passwordHash,
      role: "CUSTOMER",
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  console.log("Customer ready:");
  console.table([user]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });