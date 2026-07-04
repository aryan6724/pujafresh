import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Fresh Flowers",
    slug: "fresh-flowers",
    image: "/rose-petal.jpg",
  },
  {
    name: "Daily Pooja Packs",
    slug: "daily-pooja-packs",
    image: "/pooja-pack.jpg",
  },
  {
    name: "Pooja Samagri",
    slug: "pooja-samagri",
    image: "/kapoor-dhoop.jpg",
  },
  {
    name: "Murtis",
    slug: "murtis",
    image: "/ganesh-murti.jpg",
  },
  {
    name: "Festival Kits",
    slug: "festival-kits",
    image: "/navratri-kit.jpg",
  },
];

const products = [
  {
    name: "Basic Daily Pooja Pack",
    slug: "basic-daily-pooja-pack",
    description:
      "Affordable daily pooja pack with flowers, roli, chawal, diya and basic samagri.",
    price: 49,
    mrp: 79,
    image: "/pooja-pack.jpg",
    images: ["/pooja-pack.jpg"],
    badge: "Best Seller",
    categorySlug: "daily-pooja-packs",
    stockQuantity: 999,
    unit: "pack",
    deliveryNote: "Early Morning Delivery",
    isFeatured: true,
  },
  {
    name: "Fresh Genda Flowers",
    slug: "fresh-genda-flowers",
    description:
      "Fresh genda flowers for daily pooja, decoration and temple offerings.",
    price: 39,
    mrp: 60,
    image: "/genda-flowers.jpg",
    images: ["/genda-flowers.jpg"],
    badge: "Fresh",
    categorySlug: "fresh-flowers",
    stockQuantity: 20,
    unit: "pack",
    deliveryNote: "Delivered Tomorrow Morning",
    isFeatured: true,
  },
  {
    name: "Fresh Rose Petals",
    slug: "fresh-rose-petals",
    description:
      "Fresh rose petals for pooja, aarti, decoration and devotional use.",
    price: 59,
    mrp: 70,
    image: "/rose-petal.jpg",
    images: ["/rose-petal.jpg"],
    badge: "New",
    categorySlug: "fresh-flowers",
    stockQuantity: 998,
    unit: "pack",
    deliveryNote: "Next Morning Delivery",
    isFeatured: true,
  },
  {
    name: "Kapoor & Dhoop Combo",
    slug: "kapoor-dhoop-combo",
    description:
      "Kapoor and dhoop combo for daily aarti, fragrance and pooja rituals.",
    price: 79,
    mrp: 119,
    image: "/kapoor-dhoop.jpg",
    images: ["/kapoor-dhoop.jpg"],
    badge: "Combo",
    categorySlug: "pooja-samagri",
    stockQuantity: 999,
    unit: "combo",
    deliveryNote: "Next Morning Delivery",
    isFeatured: true,
  },
  {
    name: "Small Ganesh Ji Murti",
    slug: "small-ganesh-ji-murti",
    description:
      "Small Ganesh Ji murti suitable for home mandir, gifting and festival pooja.",
    price: 299,
    mrp: 449,
    image: "/ganesh-murti.jpg",
    images: ["/ganesh-murti.jpg"],
    badge: "Eco Friendly",
    categorySlug: "murtis",
    stockQuantity: 999,
    unit: "piece",
    deliveryNote: "Safe Home Delivery",
    isFeatured: true,
  },
  {
    name: "Complete Navratri Kit",
    slug: "complete-navratri-kit",
    description:
      "Complete Navratri kit with festive pooja essentials, kalash setup items, flowers and samagri.",
    price: 399,
    mrp: 599,
    image: "/navratri-kit.jpg",
    images: ["/navratri-kit.jpg"],
    badge: "Festival Special",
    categorySlug: "festival-kits",
    stockQuantity: 999,
    unit: "kit",
    deliveryNote: "Book Early",
    isFeatured: true,
  },
  {
    name: "Premium Daily Pooja Pack",
    slug: "premium-daily-pooja-pack",
    description:
      "Premium daily pooja pack with flowers, diya, roli, chawal and selected samagri.",
    price: 149,
    mrp: 219,
    image: "/premium-pooja-pack.jpg",
    images: ["/premium-pooja-pack.jpg"],
    badge: "Premium",
    categorySlug: "daily-pooja-packs",
    stockQuantity: 999,
    unit: "pack",
    deliveryNote: "Fresh Morning Delivery",
    isFeatured: true,
  },
];

async function main() {
  console.log("Seeding missing old product slugs...");

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

    console.log(`Ready: ${product.slug}`);
  }

  console.log("Missing old product slugs seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed missing products error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
