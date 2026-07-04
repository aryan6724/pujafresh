import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      name: true,
      slug: true,
      price: true,
      mrp: true,
      stockStatus: true,
      stockQuantity: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedProducts = products.map((product) => ({
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    mrp: Number(product.mrp || 0),
    category: product.category?.name || "No Category",
    stockStatus: product.stockStatus,
    stockQuantity: product.stockQuantity,
  }));

  console.table(formattedProducts);
}

main()
  .catch((error) => {
    console.error("Check products error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });