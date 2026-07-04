import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// These were custom-kit/internal items added earlier.
// They should not be shown as normal project products.
const unwantedSlugs = [
  "fresh-marigold-flowers",
  "agarbatti-pack",
  "diya-set",
  "kumkum",
  "roli-chawal-pack",
  "camphor-kapoor",
  "coconut",
  "pooja-thali-items",
  "prasad-pack",
  "premium-pooja-kit",
  "festival-diya-decoration-kit",
];

async function main() {
  const products = await prisma.product.findMany({
    where: {
      slug: {
        in: unwantedSlugs,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const productIds = products.map((product) => product.id);

  console.log("Cleaning internal custom-kit products from normal DB product/cart tables...");
  console.table(products);

  if (productIds.length === 0) {
    console.log("No internal products found. Nothing to clean.");
    return;
  }

  const deletedCartItems = await prisma.cartItem.deleteMany({
    where: {
      productId: {
        in: productIds,
      },
    },
  });

  const deletedProducts = await prisma.product.deleteMany({
    where: {
      id: {
        in: productIds,
      },
    },
  });

  console.log(`Deleted cart items: ${deletedCartItems.count}`);
  console.log(`Deleted products: ${deletedProducts.count}`);
  console.log("Cleanup complete.");
}

main()
  .catch((error) => {
    console.error("Cleanup error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
