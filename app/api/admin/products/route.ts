import { ProductStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const createSlug = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const mapStockToStatus = (stock?: string): ProductStatus => {
  const value = String(stock || "In Stock").trim().toLowerCase();

  if (value === "out of stock") return ProductStatus.OUT_OF_STOCK;
  if (value === "coming soon") return ProductStatus.COMING_SOON;
  if (value === "inactive") return ProductStatus.INACTIVE;

  return ProductStatus.ACTIVE;
};

const getOrCreateCategoryId = async (categoryName: string) => {
  const name = categoryName.trim() || "Daily Pooja Packs";
  const slug = createSlug(name) || "daily-pooja-packs";

  const category = await prisma.category.upsert({
    where: {
      slug,
    },
    update: {
      name,
      isActive: true,
    },
    create: {
      name,
      slug,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return category.id;
};

const buildProductData = async (body: any): Promise<Prisma.ProductCreateInput> => {
  const image = String(body.image || "/premium-pooja-pack.jpg").trim();
  const categoryId = await getOrCreateCategoryId(
    String(body.category || "Daily Pooja Packs")
  );

  return {
    name: String(body.name || "").trim(),
    slug: String(body.slug || createSlug(body.name || "product")).trim(),
    description: String(body.description || "").trim(),
    price: toNumber(body.price),
    mrp: toNumber(body.mrp || body.price),
    image,
    images: [image],
    badge: String(body.badge || "New").trim(),
    category: {
      connect: {
        id: categoryId,
      },
    },
    stockStatus: mapStockToStatus(body.stock),
    stockQuantity: toNumber(body.stockQuantity, 0),
    unit: String(body.material || body.unit || "pack").trim(),
    deliveryNote: String(body.delivery || "Next Morning Delivery").trim(),
    isFeatured: Boolean(body.isFeatured),
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await buildProductData(body);

    if (
      !data.name ||
      !data.slug ||
      Number(data.price) <= 0 ||
      Number(data.mrp || data.price) <= 0
    ) {
      return NextResponse.json(
        { ok: false, message: "Invalid product data" },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        slug: data.slug,
      },
      select: {
        id: true,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { ok: false, message: "Product slug already exists" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data,
      include: {
        category: true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("Create product error:", error);

    return NextResponse.json(
      { ok: false, message: "Unable to create product" },
      { status: 500 }
    );
  }
}
