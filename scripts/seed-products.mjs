import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Flowers",
    slug: "flowers",
    image: "/custom-kit/marigold.png",
  },
  {
    name: "Samagri",
    slug: "samagri",
    image: "/custom-kit/agarbatti.png",
  },
  {
    name: "Essentials",
    slug: "essentials",
    image: "/custom-kit/pooja-thali.png",
  },
  {
    name: "Pooja Kits",
    slug: "pooja-kits",
    image: "/premium-pooja-pack.jpg",
  },
  {
    name: "Murtis",
    slug: "murtis",
    image: "/ganesh-murti.jpg",
  },
  {
    name: "Festival Specials",
    slug: "festival-specials",
    image: "/custom-kit/diya-set.png",
  },
];

const products = [
  {
    name: "Fresh Marigold Flowers",
    slug: "fresh-marigold-flowers",
    description:
      "Fresh genda flowers for daily puja, decoration and temple offerings.",
    price: 80,
    mrp: 100,
    image: "/custom-kit/marigold.png",
    images: ["/custom-kit/marigold.png"],
    badge: "Fresh",
    categorySlug: "flowers",
    stockQuantity: 100,
    unit: "pack",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Fresh Rose Petals",
    slug: "fresh-rose-petals",
    description:
      "Fresh rose petals for puja, aarti, decoration and devotional use.",
    price: 60,
    mrp: 80,
    image: "/custom-kit/rose-petals.png",
    images: ["/custom-kit/rose-petals.png"],
    badge: "Fresh",
    categorySlug: "flowers",
    stockQuantity: 100,
    unit: "pack",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Agarbatti Pack",
    slug: "agarbatti-pack",
    description:
      "Premium incense sticks for daily puja, meditation and peaceful fragrance.",
    price: 40,
    mrp: 55,
    image: "/custom-kit/agarbatti.png",
    images: ["/custom-kit/agarbatti.png"],
    badge: "Daily Use",
    categorySlug: "samagri",
    stockQuantity: 150,
    unit: "pack",
    deliveryNote: "Same day / next morning delivery",
    isFeatured: true,
  },
  {
    name: "Diya Set",
    slug: "diya-set",
    description:
      "Traditional diya set for aarti, daily puja and festival decoration.",
    price: 50,
    mrp: 70,
    image: "/custom-kit/diya-set.png",
    images: ["/custom-kit/diya-set.png"],
    badge: "Popular",
    categorySlug: "samagri",
    stockQuantity: 120,
    unit: "set",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Kumkum",
    slug: "kumkum",
    description: "Bright red kumkum powder for tilak and pooja rituals.",
    price: 25,
    mrp: 35,
    image: "/custom-kit/kumkum.png",
    images: ["/custom-kit/kumkum.png"],
    badge: "Samagri",
    categorySlug: "samagri",
    stockQuantity: 200,
    unit: "box",
    deliveryNote: "Early morning delivery",
    isFeatured: false,
  },
  {
    name: "Roli Chawal Pack",
    slug: "roli-chawal-pack",
    description:
      "Roli and chawal pack for tilak, aarti and daily worship rituals.",
    price: 35,
    mrp: 50,
    image: "/custom-kit/roli-chawal.png",
    images: ["/custom-kit/roli-chawal.png"],
    badge: "Samagri",
    categorySlug: "samagri",
    stockQuantity: 200,
    unit: "pack",
    deliveryNote: "Early morning delivery",
    isFeatured: false,
  },
  {
    name: "Camphor / Kapoor",
    slug: "camphor-kapoor",
    description: "Kapoor tablets for aarti and devotional rituals.",
    price: 45,
    mrp: 60,
    image: "/custom-kit/kapoor.png",
    images: ["/custom-kit/kapoor.png"],
    badge: "Essential",
    categorySlug: "samagri",
    stockQuantity: 180,
    unit: "pack",
    deliveryNote: "Early morning delivery",
    isFeatured: false,
  },
  {
    name: "Coconut",
    slug: "coconut",
    description: "Fresh coconut for puja, havan and religious offerings.",
    price: 55,
    mrp: 70,
    image: "/custom-kit/coconut.png",
    images: ["/custom-kit/coconut.png"],
    badge: "Fresh",
    categorySlug: "essentials",
    stockQuantity: 80,
    unit: "piece",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Pooja Thali Items",
    slug: "pooja-thali-items",
    description:
      "Complete pooja thali essentials including diya, kumkum, chawal and ritual items.",
    price: 120,
    mrp: 160,
    image: "/custom-kit/pooja-thali.png",
    images: ["/custom-kit/pooja-thali.png"],
    badge: "Complete",
    categorySlug: "essentials",
    stockQuantity: 60,
    unit: "set",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Prasad Pack",
    slug: "prasad-pack",
    description: "Devotional prasad pack for temple offering and home puja.",
    price: 90,
    mrp: 120,
    image: "/custom-kit/prasad-pack.png",
    images: ["/custom-kit/prasad-pack.png"],
    badge: "Prasad",
    categorySlug: "essentials",
    stockQuantity: 80,
    unit: "pack",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Premium Pooja Kit",
    slug: "premium-pooja-kit",
    description:
      "Ready-made complete puja kit with flowers, diya, agarbatti, kumkum, roli chawal and prasad.",
    price: 299,
    mrp: 399,
    image: "/premium-pooja-pack.jpg",
    images: ["/premium-pooja-pack.jpg"],
    badge: "Best Seller",
    categorySlug: "pooja-kits",
    stockQuantity: 50,
    unit: "kit",
    deliveryNote: "Early morning delivery",
    isFeatured: true,
  },
  {
    name: "Festival Diya Decoration Kit",
    slug: "festival-diya-decoration-kit",
    description:
      "Festival special diya kit for decoration, aarti and devotional ambience.",
    price: 199,
    mrp: 249,
    image: "/custom-kit/diya-set.png",
    images: ["/custom-kit/diya-set.png"],
    badge: "Festival",
    categorySlug: "festival-specials",
    stockQuantity: 70,
    unit: "kit",
    deliveryNote: "Festival delivery available",
    isFeatured: true,
  },
];

async function main() {
  console.log("Seeding categories...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
        image: category.image,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        image: category.image,
        isActive: true,
      },
    });
  }

  console.log("Seeding products...");

  for (const product of products) {
    const category = await prisma.category.findUnique({
      where: {
        slug: product.categorySlug,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new Error(`Category not found: ${product.categorySlug}`);
    }

    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        image: product.image,
        images: product.images,
        badge: product.badge,
        categoryId: category.id,
        stockStatus: "ACTIVE",
        stockQuantity: product.stockQuantity,
        unit: product.unit,
        deliveryNote: product.deliveryNote,
        isFeatured: product.isFeatured,
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        image: product.image,
        images: product.images,
        badge: product.badge,
        categoryId: category.id,
        stockStatus: "ACTIVE",
        stockQuantity: product.stockQuantity,
        unit: product.unit,
        deliveryNote: product.deliveryNote,
        isFeatured: product.isFeatured,
      },
    });
  }

  console.log("Products seeded successfully.");
  console.log(`Categories: ${categories.length}`);
  console.log(`Products: ${products.length}`);
}

main()
  .catch((error) => {
    console.error("Seed products error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });