import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
  Image paths must exist inside the public folder.

  Example:
  /premium-pooja-pack.jpg means:
  public/premium-pooja-pack.jpg

  /custom-kit/kapoor.png means:
  public/custom-kit/kapoor.png
*/

const imageFixes = [
  {
    slug: "basic-daily-pooja-pack",
    image: "/basic-pooja-pack.jpg",
  },
  {
    slug: "kapoor-dhoop-combo",
    image: "/kapoor-dhoop-combo.jpg",
  },
  {
    slug: "premium-daily-pooja-pack",
    image: "/premium-pooja-pack.jpg",
  },
  {
    slug: "fresh-genda-flowers",
    image: "/genda-flowers.jpg",
  },
  {
    slug: "fresh-rose-petals",
    image: "/rose-petal.jpg",
  },
  {
    slug: "small-ganesh-ji-murti",
    image: "/ganesh-murti.jpg",
  },
  {
    slug: "complete-navratri-kit",
    image: "/navratri-kit.jpg",
  },
];

async function main() {
  console.log("Fixing product image paths...");

  for (const item of imageFixes) {
    const updatedProduct = await prisma.product.updateMany({
      where: {
        slug: item.slug,
      },
      data: {
        image: item.image,
        images: [item.image],
      },
    });

    console.log(`${item.slug} -> ${item.image} | updated: ${updatedProduct.count}`);
  }

  console.log("Product image paths fixed successfully.");
}

main()
  .catch((error) => {
    console.error("Fix image paths error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
